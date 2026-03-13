// challenges.js - Fixed Version
const ChallengesScreen = {
    currentTopic: null,
    challenges: [],
    
    async loadTopic(topicName) {
        showLoading();
        
        try {
            const userId = App.currentUser;
            const response = await fetch(`/api/challenges/${encodeURIComponent(topicName)}?userId=${userId}`);
            const data = await response.json();
            
            this.currentTopic = data;
            this.challenges = data.challenges;
            
            this.render();
        } catch (err) {
            console.error('Error loading challenges:', err);
            alert('Failed to load challenges. Please try again.');
        } finally {
            hideLoading();
        }
    },
    
    render() {
        const template = document.getElementById('topics-view').content.cloneNode(true);
        const container = template.querySelector('.topics-grid');
        container.innerHTML = ''; // Clear any existing content
        
        this.challenges.forEach(challenge => {
            const card = new ChallengeCard(challenge, (challengeData) => {
                this.showChallengeDetail(challengeData);
            });
            card.render(container);
        });
        
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '';
        contentArea.appendChild(template);
    },
    
    async showChallengeDetail(challenge) {
        // Check if this is first time seeing this challenge
        const isNew = !challenge.progress || challenge.progress.quest1Mastery === 0;
        
        if (isNew) {
            await this.showSubtopicTeaser(challenge);
        }
        
        const template = document.getElementById('quest-detail-view').content.cloneNode(true);
        
        template.querySelector('.challenge-icon-large').textContent = challenge.icon || '📘';
        template.getElementById('challenge-name').textContent = challenge.name;
        template.getElementById('challenge-description').textContent = 
            challenge.description || `Master ${challenge.name.toLowerCase()}`;
        
        template.querySelector('.back-btn').addEventListener('click', () => {
            this.loadTopic(this.currentTopic.name);
        });
        
        const questsGrid = template.querySelector('#quests-grid');
        
        challenge.questsList.forEach(quest => {
            const questCard = QuestProgress.renderQuestCard(
                quest, 
                challenge.id, 
                (questId) => this.startQuest(challenge, questId)
            );
            questsGrid.appendChild(questCard);
        });
        
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '';
        contentArea.appendChild(template);
    },
    
    async startQuest(challenge, questId) {
        showLoading();
        
        try {
            const userId = App.currentUser;
            const topicName = this.currentTopic.name;
            
            console.log('🎯 Starting quest:', {
                topic: topicName,
                challengeId: challenge.id,
                questId: questId,
                userId: userId
            });
            
            if (typeof QuestScreen === 'undefined') {
                throw new Error('QuestScreen is not loaded. Check script order.');
            }
            
            const url = `/api/quests/${encodeURIComponent(topicName)}/${challenge.id}/${questId}?userId=${userId}`;
            console.log('📡 Fetching:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const questData = await response.json();
            console.log('✅ Quest data received:', questData);
            
            QuestScreen.init(questData, challenge, () => {
                this.showChallengeDetail(challenge);
            });
            
        } catch (err) {
            console.error('❌ Error starting quest:', err);
            alert(`Failed to start quest: ${err.message}`);
        } finally {
            hideLoading();
        }
    },
    
    async showSubtopicTeaser(challenge) {
        // Find a default GLB for this subtopic
        const glbPath = `/assets/science/musklo-skeletal-system/quest_${challenge.id}_human_skeleton/female_skeleton.glb`;
        
        try {
            if (!window.SimulationLoader) {
                await this.loadScript('js/simulation-loader.js');
                await SimulationLoader.init();
            }
            
            await SimulationLoader.showTeaser(challenge.name, glbPath);
        } catch (err) {
            console.log('Teaser not available:', err);
        }
    },
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};

window.ChallengesScreen = ChallengesScreen;