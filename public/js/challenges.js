// challenges.js - Complete Fixed Version with Debug
console.log('📦 challenges.js loading started...');
console.log('   QuestScreen available at start?', typeof QuestScreen !== 'undefined' ? '✅' : '❌');

if (typeof QuestScreen === 'undefined') {
    console.error('❌ CRITICAL: QuestScreen not loaded yet! Script order problem.');
    console.log('   Current script order - quest.js must load BEFORE challenges.js');
}

const ChallengesScreen = {
    currentTopic: null,
    challenges: [],
    
    async loadTopic(topicName) {
        console.log('📚 ChallengesScreen.loadTopic called with:', topicName);
        showLoading();
        
        try {
            const userId = window.App?.currentUser || 'student-001';
            const response = await fetch(`/api/challenges/${encodeURIComponent(topicName)}?userId=${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Challenges data received:', data);
            
            this.currentTopic = data;
            this.challenges = data.challenges || [];
            
            this.render();
        } catch (err) {
            console.error('❌ Error loading challenges:', err);
            alert('Failed to load challenges. Please try again.');
        } finally {
            hideLoading();
        }
    },
    
    render() {
        console.log('🎨 Rendering challenges screen');
        const template = document.getElementById('topics-view').content.cloneNode(true);
        const container = template.querySelector('.topics-grid');
        container.innerHTML = ''; // Clear any existing content
        
        this.challenges.forEach(challenge => {
            try {
                const card = new ChallengeCard(challenge, (challengeData) => {
                    this.showChallengeDetail(challengeData);
                });
                card.render(container);
            } catch (err) {
                console.error('Error rendering challenge card:', err, challenge);
            }
        });
        
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error('❌ Content area not found!');
            return;
        }
        
        contentArea.innerHTML = '';
        contentArea.appendChild(template);
    },
    
    async showChallengeDetail(challenge) {
        console.log('🔍 Showing challenge detail:', challenge);
        
        // Check if this is first time seeing this challenge
        const isNew = !challenge.progress || challenge.progress.quest1Mastery === 0;
        
        if (isNew) {
            try {
                await this.showSubtopicTeaser(challenge);
            } catch (err) {
                console.log('Teaser not available:', err);
            }
        }
        
        const template = document.getElementById('quest-detail-view').content.cloneNode(true);
        
        // Set challenge info
        const iconEl = template.querySelector('.challenge-icon-large');
        if (iconEl) iconEl.textContent = challenge.icon || '📘';
        
        const nameEl = template.getElementById('challenge-name');
        if (nameEl) nameEl.textContent = challenge.name;
        
        const descEl = template.getElementById('challenge-description');
        if (descEl) descEl.textContent = challenge.description || `Master ${challenge.name.toLowerCase()}`;
        
        // Back button
        const backBtn = template.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.loadTopic(this.currentTopic.name);
            });
        }
        
        // Render quests
        const questsGrid = template.querySelector('#quests-grid');
        if (!questsGrid) {
            console.error('❌ Quests grid not found!');
            return;
        }
        
        if (!challenge.questsList || !Array.isArray(challenge.questsList)) {
            console.error('❌ No questsList in challenge:', challenge);
            questsGrid.innerHTML = '<div class="error">No quests available</div>';
        } else {
            challenge.questsList.forEach(quest => {
                try {
                    if (typeof QuestProgress === 'undefined') {
                        console.error('❌ QuestProgress not defined!');
                        return;
                    }
                    
                    const questCard = QuestProgress.renderQuestCard(
                        quest, 
                        challenge.id, 
                        (questId) => this.startQuest(challenge, questId)
                    );
                    questsGrid.appendChild(questCard);
                } catch (err) {
                    console.error('Error rendering quest card:', err, quest);
                }
            });
        }
        
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error('❌ Content area not found!');
            return;
        }
        
        contentArea.innerHTML = '';
        contentArea.appendChild(template);
    },
    
    async startQuest(challenge, questId) {
        console.log('🎯 startQuest called with:', { challenge, questId });
        console.log('   Checking QuestScreen...', typeof QuestScreen !== 'undefined' ? '✅' : '❌');
        
        // If QuestScreen isn't ready, wait a bit
        if (typeof QuestScreen === 'undefined') {
            console.log('⏳ QuestScreen not ready, waiting 200ms...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (typeof QuestScreen === 'undefined') {
                console.error('❌ QuestScreen still not available after waiting');
                alert('Error loading game engine. Please refresh the page.');
                return;
            }
            console.log('✅ QuestScreen became available after waiting');
        }
        
        showLoading();
        
        try {
            const userId = window.App?.currentUser || 'student-001';
            const topicName = this.currentTopic?.name;
            
            if (!topicName) {
                throw new Error('No topic name available');
            }
            
            console.log('🎯 Starting quest details:', {
                topic: topicName,
                challengeId: challenge.id,
                questId: questId,
                userId: userId
            });
            
            const selectedMode = await this.promptQuestMode();
            console.log('🎮 Selected quest mode:', selectedMode);
            if (window.DynamicModeSelector) {
                window.DynamicModeSelector.setForcedMode(selectedMode);
            }
            
            const url = `/api/quests/${encodeURIComponent(topicName)}/${challenge.id}/${questId}?userId=${userId}`;
            console.log('📡 Fetching:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const questData = await response.json();
            console.log('✅ Quest data received:', questData);
            
            // Double check QuestScreen before using it
            if (typeof QuestScreen === 'undefined') {
                throw new Error('QuestScreen disappeared!');
            }
            
            QuestScreen.init(questData, challenge, () => {
                console.log('🏁 Quest completed, returning to challenge detail');
                this.showChallengeDetail(challenge);
            });
            
        } catch (err) {
            console.error('❌ Error starting quest:', err);
            alert(`Failed to start quest: ${err.message}`);
        } finally {
            hideLoading();
        }
    },

    async promptQuestMode() {
        if (!window.DynamicModeSelector) return 'random';

        return new Promise(resolve => {
            const existing = document.getElementById('mode-select-overlay');
            if (existing) {
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.id = 'mode-select-overlay';
            overlay.className = 'mode-select-overlay';
            overlay.innerHTML = `
                <div class="mode-select-card">
                    <h2>Choose a quest mode</h2>
                    <p>Select one of these modes to try the dynamic features immediately.</p>
                    <div class="mode-buttons">
                        <button class="mode-button" data-mode="normal">Normal</button>
                        <button class="mode-button" data-mode="speedTimer">Speed Timer</button>
                        <button class="mode-button" data-mode="reverse">Reverse</button>
                        <button class="mode-button" data-mode="random">Dynamic</button>
                    </div>
                    <button class="mode-close-btn">Start Quest</button>
                </div>
            `;

            document.body.appendChild(overlay);

            const chooseMode = (mode) => {
                if (window.DynamicModeSelector) {
                    window.DynamicModeSelector.setForcedMode(mode);
                }
                overlay.remove();
                resolve(mode);
            };

            overlay.addEventListener('click', (event) => {
                if (event.target.classList.contains('mode-button')) {
                    document.querySelectorAll('.mode-button').forEach(btn => btn.classList.remove('selected'));
                    event.target.classList.add('selected');
                }
                if (event.target.classList.contains('mode-close-btn')) {
                    const selected = overlay.querySelector('.mode-button.selected');
                    const mode = selected ? selected.dataset.mode : 'random';
                    chooseMode(mode);
                }
            });

            const style = document.createElement('style');
            style.id = 'mode-select-styles';
            style.textContent = `
                .mode-select-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    z-index: 30000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                }
                .mode-select-card {
                    background: #111827;
                    color: #f8fafc;
                    border-radius: 22px;
                    padding: 28px 26px;
                    max-width: 460px;
                    width: 100%;
                    box-shadow: 0 24px 80px rgba(0,0,0,0.45);
                    text-align: center;
                }
                .mode-select-card h2 {
                    margin-bottom: 10px;
                    font-size: 1.55rem;
                }
                .mode-select-card p {
                    margin-bottom: 22px;
                    color: #cbd5e1;
                    line-height: 1.55;
                }
                .mode-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    justify-content: center;
                    margin-bottom: 18px;
                }
                .mode-button {
                    border: 1px solid rgba(255,255,255,0.18);
                    background: rgba(255,255,255,0.05);
                    color: #f8fafc;
                    padding: 12px 18px;
                    border-radius: 14px;
                    min-width: 108px;
                    cursor: pointer;
                    transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
                }
                .mode-button.selected,
                .mode-button:hover {
                    background: #2563eb;
                    border-color: #7dd3fc;
                    transform: translateY(-1px);
                }
                .mode-close-btn {
                    border: none;
                    background: #38bdf8;
                    color: #0f172a;
                    font-weight: 700;
                    padding: 12px 24px;
                    border-radius: 14px;
                    cursor: pointer;
                    width: 100%;
                }
            `;
            if (!document.getElementById('mode-select-styles')) {
                document.head.appendChild(style);
            }
        });
    },
    
    async showSubtopicTeaser(challenge) {
        console.log('🎬 Showing teaser for:', challenge.name);
        
        // Find a default GLB for this subtopic
        // This is a simplified example - adjust path based on your actual structure
        const glbPath = `/assets/science/musklo-skeletal-system/quest_${challenge.id}_human_skeleton/female_skeleton.glb`;
        
        try {
            // Load simulation loader if needed
            if (!window.SimulationLoader) {
                console.log('📦 SimulationLoader not found, loading...');
                await this.loadScript('js/simulation-loader.js');
                if (!window.SimulationLoader) {
                    throw new Error('Failed to load SimulationLoader');
                }
                await SimulationLoader.init();
            }
            
            // Show teaser
            await SimulationLoader.showTeaser(challenge.name, glbPath);
            console.log('✅ Teaser shown');
        } catch (err) {
            console.log('⚠️ Teaser not available:', err.message);
            // Continue without teaser
        }
    },
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`✅ Script loaded: ${src}`);
                resolve();
            };
            script.onerror = (err) => {
                console.error(`❌ Failed to load script: ${src}`, err);
                reject(err);
            };
            document.head.appendChild(script);
        });
    }
};

// Make sure ChallengesScreen is globally available
window.ChallengesScreen = ChallengesScreen;
console.log('✅ ChallengesScreen registered globally');

// Add DOMContentLoaded check
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM fully loaded, challenges.js ready');
    console.log('   Final QuestScreen check:', typeof QuestScreen !== 'undefined' ? '✅' : '❌');
});

// Export for module systems if needed (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChallengesScreen;
}