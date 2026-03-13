// public/js/simulation-loader.js
const SimulationLoader = {
    engines: {},
    modelViewerLoaded: false,
    
    async init() {
        console.log('🔧 Initializing SimulationLoader...');
        
        // Load Model Viewer if not already loaded
        if (!document.querySelector('script[src*="model-viewer"]')) {
            await this.loadModelViewer();
        }
        
        // Preload common engines
        await this.preloadEngines();
        
        console.log('✅ SimulationLoader ready');
        return this;
    },
    
    loadModelViewer() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
            script.onload = () => {
                this.modelViewerLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    async preloadEngines() {
        // List of common engines we might need
        const engines = [
            '3D-skeleton-engine',
            'gallery-study-engine',
            'image-hotspots-engine'
        ];
        
        for (const engine of engines) {
            try {
                this.engines[engine] = await import(`./engines/${engine}.js`);
                console.log(`✅ Loaded engine: ${engine}`);
            } catch (err) {
                console.log(`⚠️ Engine ${engine} not available yet`);
            }
        }
    },
    
    async loadSimulation(question) {
        const engineName = question.engine_type_sim;
        const mode = question.mode_sim;
        
        console.log(`🎮 Loading simulation: ${engineName} (${mode})`);
        
        try {
            // Get engine
            let engine = this.engines[engineName];
            if (!engine) {
                engine = await import(`./engines/${engineName}.js`);
                this.engines[engineName] = engine;
            }
            
            // Construct full path (remove /content/ from beginning)
            const filePath = question.file_path_sim.replace(/^\/content/, '');
            const fullUrl = `/api/quests/simulation${filePath}`;
            
            // Load metadata
            const response = await fetch(fullUrl);
            if (!response.ok) {
                throw new Error(`Failed to load simulation metadata: ${response.status}`);
            }
            
            const metadata = await response.json();
            
            // Create container
            const container = document.createElement('div');
            container.className = 'simulation-container';
            container.style.width = '100%';
            container.style.height = '500px';
            container.style.position = 'relative';
            
            // Render based on mode
            if (mode === 'study' || mode.includes('study')) {
                if (engine.default?.renderStudy) {
                    await engine.default.renderStudy(container, metadata);
                } else if (engine.renderStudy) {
                    await engine.renderStudy(container, metadata);
                } else {
                    await this.renderFallbackStudy(container, metadata);
                }
            } else if (mode === 'labeling' || mode.includes('labeling')) {
                if (engine.default?.renderLabeling) {
                    await engine.default.renderLabeling(container, metadata);
                } else if (engine.renderLabeling) {
                    await engine.renderLabeling(container, metadata);
                } else {
                    await this.renderFallbackLabeling(container, metadata);
                }
            }
            
            return container;
            
        } catch (err) {
            console.error('❌ Error loading simulation:', err);
            return this.createErrorDisplay(err.message);
        }
    },
    
    renderFallbackStudy(container, metadata) {
        // Fallback if engine doesn't have specific methods
        const glbFile = metadata.glb || metadata.model || metadata.file;
        const glbPath = glbFile ? this.resolveGLBPath(glbFile, metadata) : null;
        
        container.innerHTML = `
            <model-viewer 
                src="${glbPath || ''}"
                alt="${metadata.title || '3D Model'}"
                auto-rotate
                camera-controls
                style="width: 100%; height: 100%; background-color: #f0f4ff;"
                environment-image="neutral"
                shadow-intensity="1">
            </model-viewer>
            ${metadata.notes ? `
                <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; 
                            background: rgba(255,255,255,0.9); padding: 15px; border-radius: 10px;">
                    <p>${metadata.notes}</p>
                </div>
            ` : ''}
        `;
    },
    
    renderFallbackLabeling(container, metadata) {
        // Simple labeling fallback
        const glbFile = metadata.glb || metadata.model || metadata.file;
        const glbPath = glbFile ? this.resolveGLBPath(glbFile, metadata) : null;
        const hotspots = metadata.hotspots || [];
        
        let hotspotsHTML = '';
        hotspots.forEach((hotspot, index) => {
            hotspotsHTML += `
                <button slot="hotspot-${index}" 
                        class="hotspot-button"
                        style="position: absolute; transform: translate(-50%, -50%);"
                        data-position="${hotspot.position || '0 0 0'}"
                        data-normal="${hotspot.normal || '0 0 1'}"
                        onclick="SimulationLoader.showHotspotInfo('${hotspot.label || 'Part'}', '${hotspot.info || ''}')">
                    <div style="width: 20px; height: 20px; background: #667eea; border-radius: 50%; border: 2px solid white;"></div>
                </button>
            `;
        });
        
        container.innerHTML = `
            <model-viewer 
                src="${glbPath || ''}"
                alt="${metadata.title || '3D Model'}"
                camera-controls
                style="width: 100%; height: 100%; background-color: #f0f4ff;"
                environment-image="neutral"
                shadow-intensity="1">
                ${hotspotsHTML}
            </model-viewer>
        `;
    },
    
    resolveGLBPath(glbFile, metadata) {
        // Extract directory from metadata path
        const baseDir = metadata._filePath ? 
            metadata._filePath.substring(0, metadata._filePath.lastIndexOf('/')) : '';
        
        return `/assets${baseDir}/${glbFile}`;
    },
    
    showHotspotInfo(label, info) {
        alert(`${label}\n\n${info || 'No additional information available.'}`);
    },
    
    createErrorDisplay(message) {
        const div = document.createElement('div');
        div.className = 'simulation-error';
        div.innerHTML = `
            <div style="padding: 40px; text-align: center; background: #fee; border-radius: 10px;">
                <p style="color: #c00; font-size: 1.2em;">❌ Failed to load simulation</p>
                <p style="color: #666;">${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px;">
                    Continue
                </button>
            </div>
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
                background: rgba(0,0,0,0.9);
                z-index: 2000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s;
            `;
            
            teaserDiv.innerHTML = `
                <model-viewer 
                    src="${glbPath}"
                    alt="${subtopic} preview"
                    auto-rotate
                    camera-controls
                    disable-zoom
                    interaction-prompt="none"
                    style="width: 100%; height: 70%; max-width: 800px;">
                </model-viewer>
                <div style="text-align: center; color: white; margin-top: 20px;">
                    <h2>${subtopic}</h2>
                    <p>Get ready to explore in 3D!</p>
                    <button class="skip-teaser-btn" 
                            style="margin-top: 20px; padding: 10px 30px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Skip
                    </button>
                </div>
            `;
            
            document.body.appendChild(teaserDiv);
            
            // Auto-remove after 10 seconds
            const timer = setTimeout(() => {
                teaserDiv.remove();
                resolve();
            }, 10000);
            
            // Skip button
            teaserDiv.querySelector('.skip-teaser-btn').addEventListener('click', () => {
                clearTimeout(timer);
                teaserDiv.remove();
                resolve();
            });
        });
    }
};

// Global helper for hotspot clicks
window.SimulationLoader = SimulationLoader;
window.showHotspotInfo = SimulationLoader.showHotspotInfo.bind(SimulationLoader);