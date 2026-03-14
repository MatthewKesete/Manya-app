// public/js/simulation-loader.js
const ENGINE_NAME_MAP = {
    // Map database values to actual filenames
    '3D_SKELETON': '3D-skeleton-engine',
    '3D_SKELETON_ENGINE': '3D-skeleton-engine',
    'GALLERY_STUDY': 'gallery-study-engine',
    'GALLERY_STUDY_ENGINE': 'gallery-study-engine',
    'IMAGE_HOTSPOTS': 'image-hotspots-engine',
    'IMAGE_HOTSPOTS_ENGINE': 'image-hotspots-engine',
    'MCQ': 'mcq-standalone',
    'MCQ_STANDALONE': 'mcq-standalone',
    'READER_STUDY': 'reader-study-engine',
    'READER_STUDY_ENGINE': 'reader-study-engine',
    'PROCEDURAL_CANVAS': 'procedural-canvas-engine',
    'BINARY_GENERATOR': 'math-engines/binary-generator-engine',
    'PIZZA_GAME': 'math-engines/pizza-game-engine',
    'SET_CLASSIFIER': 'math-engines/set-classifier-engine',
    'SET_STUDY': 'math-engines/set-study-engine',
    'SET_THEORY': 'math-engines/set-theory-engine',
    'SUBSET_GAME': 'math-engines/subset-game-engine',
    'VENN_PROB': 'math-engines/venn-prob-engine',
    'VENN_SPOTLIGHT': 'math-engines/venn-spotlight-engine',
    'CHAT_ENGINE': 'english-engines/chat_engine',
    'DEEP_READER': 'english-engines/deep_reader',
    'ENGLISH_RULE_MASTER': 'english-engines/english_rule_master',
    'FUNCTIONAL_COMPOSER': 'english-engines/functional_composer',
    'GRAMMAR_MAZE': 'english-engines/game-grammar-maze',
    'HANGMAN': 'english-engines/game-hangman',
    'HARVEST_ENGINE': 'english-engines/game-harvest-engine',
    'MEMORY_MATCH': 'english-engines/game-memory-match',
    'SENTENCE_TRAIN': 'english-engines/game-sentence-train',
    'WORDGRID': 'english-engines/game-wordgrid',
    'MORPH_GAME': 'english-engines/morph_game',
    'SYNTAX_ARCHITECT': 'english-engines/syntax-architect',
    'UNIVERSAL_GLOBE': 'sst-engines/universal-globe-engine',
};

const SimulationLoader = {
    engines: {},
    modelViewerLoaded: false,
    basePath: '/app-shell/js/engines/', // Base path from your file tree
    
    async init() {
        console.log('🔧 Initializing SimulationLoader...');
        console.log('   Base path:', this.basePath);
        
        if (!document.querySelector('script[src*="model-viewer"]')) {
            await this.loadModelViewer();
        }
        
        console.log('✅ SimulationLoader ready');
        return this;
    },
    
    loadModelViewer() {
        return new Promise((resolve, reject) => {
            if (document.querySelector('script[src*="model-viewer"]')) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    async loadSimulation(question) {
        console.log('🎮 Loading simulation:', question);
        
        if (!question) {
            return this.createErrorDisplay('No simulation data');
        }
        
        const dbEngineName = question.engine_type_sim;
        const mode = question.mode_sim;
        const filePath = question.file_path_sim;
        
        console.log(`   Database engine value: ${dbEngineName}, Mode: ${mode}, Path: ${filePath}`);
        
        if (!dbEngineName) {
            console.error('❌ No engine_type_sim specified');
            return this.createErrorDisplay('Simulation engine not specified');
        }
        
        // Map the database value to actual filename
        const mappedName = ENGINE_NAME_MAP[dbEngineName];
        if (!mappedName) {
            console.error(`❌ No mapping found for engine: ${dbEngineName}`);
            return this.createErrorDisplay(`Unknown engine type: ${dbEngineName}`);
        }
        
        console.log(`   Mapped to: ${mappedName}`);
        
        try {
            // Get the base URL
            const baseUrl = window.location.origin;
            
            // Construct the full path
            const enginePath = `${baseUrl}${this.basePath}${mappedName}.js`;
            console.log(`📦 Loading engine from: ${enginePath}`);
            
            // Try to load the engine
            let engine;
            try {
                engine = await import(enginePath);
                console.log(`✅ Successfully loaded engine`);
            } catch (err) {
                console.error(`❌ Failed to load from primary path:`, err);
                
                // Try alternative paths
                const altPaths = [
                    `${baseUrl}/app-shell/js/engines/${mappedName}.js`,
                    `${baseUrl}/js/simulations/app-shell/js/engines/${mappedName}.js`,
                    `/app-shell/js/engines/${mappedName}.js`,
                    `./app-shell/js/engines/${mappedName}.js`,
                ];
                
                let loaded = false;
                for (const altPath of altPaths) {
                    try {
                        console.log(`   Trying alternative: ${altPath}`);
                        engine = await import(altPath);
                        console.log(`   ✅ Success with: ${altPath}`);
                        loaded = true;
                        break;
                    } catch (e) {
                        console.log(`   ❌ Failed: ${altPath}`);
                    }
                }
                
                if (!loaded) {
                    throw new Error(`Could not load engine from any path`);
                }
            }
            
            // Load metadata
            let metadata = {};
            if (filePath) {
                try {
                    const cleanPath = filePath.replace(/^\/content/, '');
                    const metadataUrl = `/api/quests/simulation${cleanPath}`;
                    console.log(`📡 Fetching metadata from: ${metadataUrl}`);
                    
                    const response = await fetch(metadataUrl);
                    if (response.ok) {
                        metadata = await response.json();
                        console.log('✅ Metadata loaded');
                    } else {
                        console.warn(`⚠️ Metadata fetch failed: ${response.status}`);
                    }
                } catch (fetchErr) {
                    console.warn('⚠️ Could not load metadata:', fetchErr);
                }
            }
            
            // Create container
            const container = document.createElement('div');
            container.className = 'simulation-container';
            container.style.width = '100%';
            container.style.height = '500px';
            container.style.position = 'relative';
            container.style.background = '#f0f4ff';
            container.style.borderRadius = '10px';
            container.style.overflow = 'hidden';
            
            // Render based on mode
            if (mode === 'study' || mode?.includes('study')) {
                if (engine.default?.renderStudy) {
                    await engine.default.renderStudy(container, metadata, question);
                } else if (engine.renderStudy) {
                    await engine.renderStudy(container, metadata, question);
                } else {
                    await this.renderFallbackStudy(container, metadata, question);
                }
            } else if (mode === 'labeling' || mode?.includes('labeling')) {
                if (engine.default?.renderLabeling) {
                    await engine.default.renderLabeling(container, metadata, question);
                } else if (engine.renderLabeling) {
                    await engine.renderLabeling(container, metadata, question);
                } else {
                    await this.renderFallbackLabeling(container, metadata, question);
                }
            } else {
                await this.renderFallbackStudy(container, metadata, question);
            }
            
            return container;
            
        } catch (err) {
            console.error('❌ Error loading simulation:', err);
            return this.createErrorDisplay(err.message);
        }
    },
    
    renderFallbackStudy(container, metadata, question) {
        console.log('📝 Using fallback study renderer');
        
        // Try to find a GLB file
        let glbPath = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
        
        if (metadata?.glb) {
            const filePath = question.file_path_sim || '';
            const lastSlash = filePath.lastIndexOf('/');
            const baseDir = lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
            const cleanBaseDir = baseDir.replace(/^\/content/, '');
            glbPath = `/assets${cleanBaseDir}/${metadata.glb}`;
            console.log('   GLB path:', glbPath);
        }
        
        container.innerHTML = `
            <model-viewer 
                src="${glbPath}"
                alt="3D Model"
                auto-rotate
                camera-controls
                style="width: 100%; height: 100%; background-color: #111827;"
                environment-image="neutral"
                shadow-intensity="1"
                exposure="0.8"
                interaction-prompt="none">
            </model-viewer>
            ${metadata?.notes ? `
                <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; 
                            background: rgba(0,0,0,0.8); color: white; padding: 15px; border-radius: 10px;">
                    <p style="margin: 0;">${metadata.notes}</p>
                </div>
            ` : ''}
        `;
    },
    
    renderFallbackLabeling(container, metadata, question) {
        console.log('📝 Using fallback labeling renderer');
        
        let glbPath = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
        
        if (metadata?.glb) {
            const filePath = question.file_path_sim || '';
            const lastSlash = filePath.lastIndexOf('/');
            const baseDir = lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
            const cleanBaseDir = baseDir.replace(/^\/content/, '');
            glbPath = `/assets${cleanBaseDir}/${metadata.glb}`;
        }
        
        const hotspots = metadata?.hotspots || [];
        let hotspotsHTML = '';
        
        hotspots.forEach((hotspot, index) => {
            const label = hotspot.label || `Part ${index + 1}`;
            const position = hotspot.position || '0 0 0';
            const normal = hotspot.normal || '0 1 0';
            
            hotspotsHTML += `
                <button slot="hotspot-${index}" 
                        class="hotspot-button"
                        style="position: absolute; transform: translate(-50%, -50%); width: 30px; height: 30px;
                               background: #667eea; border: 2px solid white; border-radius: 50%; cursor: pointer;
                               box-shadow: 0 2px 10px rgba(0,0,0,0.3);"
                        data-position="${position}"
                        data-normal="${normal}"
                        onclick="alert('${label}')">
                    <div style="width: 100%; height: 100%;"></div>
                </button>
            `;
        });
        
        container.innerHTML = `
            <model-viewer 
                src="${glbPath}"
                alt="Labeling Model"
                camera-controls
                style="width: 100%; height: 100%; background-color: #111827;"
                environment-image="neutral"
                shadow-intensity="1"
                exposure="0.8"
                interaction-prompt="none">
                ${hotspotsHTML}
            </model-viewer>
        `;
    },
    
    createErrorDisplay(message) {
        const div = document.createElement('div');
        div.className = 'simulation-error';
        div.style.cssText = `
            padding: 40px;
            text-align: center;
            background: #fee;
            border-radius: 10px;
            color: #c00;
            font-size: 1.1em;
        `;
        div.innerHTML = `
            <p>❌ Failed to load simulation</p>
            <p style="font-size: 0.9em; color: #666;">${message || 'Unknown error'}</p>
            <button onclick="this.parentElement.remove()" 
                    style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Continue
            </button>
        `;
        return div;
    },
    
    async showTeaser(subtopic, glbPath) {
        return new Promise((resolve) => {
            const teaserDiv = document.createElement('div');
            teaserDiv.className = 'simulation-teaser';
            teaserDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.95);
                z-index: 2000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s;
            `;
            
            teaserDiv.innerHTML = `
                <model-viewer 
                    src="${glbPath || 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'}"
                    alt="${subtopic} preview"
                    auto-rotate
                    camera-controls
                    disable-zoom
                    interaction-prompt="none"
                    style="width: 100%; height: 70%; max-width: 800px;">
                </model-viewer>
                <div style="text-align: center; color: white; margin-top: 20px;">
                    <h2 style="font-size: 2em; margin-bottom: 10px;">${subtopic}</h2>
                    <p style="opacity: 0.8; margin-bottom: 20px;">Get ready to explore in 3D!</p>
                    <button class="skip-teaser-btn" 
                            style="padding: 12px 40px; background: #667eea; color: white; border: none; 
                                   border-radius: 8px; font-size: 1.1em; cursor: pointer;">
                        Skip
                    </button>
                </div>
            `;
            
            document.body.appendChild(teaserDiv);
            
            const timer = setTimeout(() => {
                teaserDiv.remove();
                resolve();
            }, 10000);
            
            teaserDiv.querySelector('.skip-teaser-btn').addEventListener('click', () => {
                clearTimeout(timer);
                teaserDiv.remove();
                resolve();
            });
        });
    }
};

window.SimulationLoader = SimulationLoader;