// At the very top of app.js
console.log('🔍 Checking global objects:', {
    QuestScreen: typeof QuestScreen !== 'undefined' ? '✅' : '❌',
    ChallengesScreen: typeof ChallengesScreen !== 'undefined' ? '✅' : '❌',
    GameModes: typeof GameModes !== 'undefined' ? '✅' : '❌'
});

// If QuestScreen is missing, show error
if (typeof QuestScreen === 'undefined') {
    console.error('❌ CRITICAL: QuestScreen not loaded! Check script order.');
}
// Main Application Controller
// app.js - Fixed Version
const App = {
    currentUser: 'student-001',
    currentView: 'topics',
    
async init() {
    console.log('🚀 Initializing MANYA app...');
    
    // Initialize audio system
    if (window.MANYAAudioSystem && window.MANYAAudioSystem.init) {
        window.MANYAAudioSystem.init();
    }
    
    // Initialize character system
    if (window.MANYACharacterSystem && window.MANYACharacterSystem.init) {
        window.MANYACharacterSystem.init();
    }
    
    // Load user data
    await this.loadUserData();
    
    if (window.GemDisplay && window.GemDisplay.loadGems) {
        await window.GemDisplay.loadGems(this.currentUser);
    }
    
    this.setupNavigation();
    this.loadView('topics');
    
    // Activate audio on first click
    const activateAudio = () => {
        if (window.MANYAAudioSystem && window.MANYAAudioSystem.playClick) {
            window.MANYAAudioSystem.playClick();
        }
        document.removeEventListener('click', activateAudio);
        document.removeEventListener('touchstart', activateAudio);
    };
    document.addEventListener('click', activateAudio);
    document.addEventListener('touchstart', activateAudio);
},
    
   // In app.js - update loadUserData method
async loadUserData() {
    try {
        const response = await fetch(`/api/gamification/summary/${this.currentUser}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        console.log('📊 Gamification summary loaded:', data);
        
        // Update basic stats
        if (document.getElementById('streakCount')) {
            document.getElementById('streakCount').textContent = data.stats.currentStreak || 0;
        }
        
        // Update coins and stars
        if (document.getElementById('coin-balance')) {
            document.getElementById('coin-balance').textContent = data.stats.coins || 0;
        }
        if (document.getElementById('pointsTotal')) {
            document.getElementById('pointsTotal').textContent = data.stats.totalStars || 0;
        }
        
        // Update rare gems in compact row if quest is active
        const rareGemEl = document.getElementById('compact-rare-gems');
        if (rareGemEl) {
            rareGemEl.textContent = data.stats.gems || 0;
        }
        
        // Update psychological params if QuestScreen is active
        if (window.QuestScreen && window.QuestScreen.updateParameterDisplays) {
            // We might want to keep fetching detailed stats for psych params
            const statsResp = await fetch(`/api/stats/user-stats/${this.currentUser}`);
            const statsData = await statsResp.json();
            window.QuestScreen.params.accuracy = statsData.summary?.overallAccuracy || 0;
            window.QuestScreen.updateParameterDisplays();
        }
        
    } catch (err) {
        console.error('Error loading user data:', err);
    }
},
    
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.loadView(view);
                
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        document.getElementById('userSelect').addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'new-user') {
                this.createNewUser();
            } else {
                this.currentUser = value;
                this.loadUserData();
                this.loadView(this.currentView);
            }
        });
    },
    
    async loadView(view) {
        this.currentView = view;
        
        try {
            switch(view) {
                case 'topics':
                    if (typeof ChallengesScreen === 'undefined') {
                        console.error('❌ ChallengesScreen not loaded!');
                        document.getElementById('content-area').innerHTML = 
                            '<div class="error">Failed to load challenges. Please refresh.</div>';
                        return;
                    }
                    await ChallengesScreen.loadTopic('Musculo-Skeletal System');
                    break;
                    
                case 'profile':
                    this.loadProfile();
                    break;
                    
                case 'achievements':
                    this.loadAchievements();
                    break;
                    
                case 'treasure-box':
                    this.loadTreasureBox();
                    break;
            }
        } catch (err) {
            console.error('Error loading view:', err);
        }
    },
    
    async createNewUser() {
        const name = prompt('Enter your name:');
        if (!name) return;
        
        try {
            const response = await fetch('/api/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: name })
            });
            
            const data = await response.json();
            
            if (data.userId) {
                this.currentUser = data.userId;
                
                const select = document.getElementById('userSelect');
                const option = new Option(`👤 ${name}`, data.userId);
                select.insertBefore(option, select.lastElementChild);
                select.value = data.userId;
                
                this.loadUserData();
                this.loadView(this.currentView);
            }
            
        } catch (err) {
            console.error('Error creating user:', err);
            alert('Failed to create user');
        }
    },
    
    async loadProfile() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '<div class="loading">Loading profile...</div>';
        
        try {
            const response = await fetch(`/api/profile/${this.currentUser}`);
            const profile = await response.json();
            
            // TODO: Render profile view
            contentArea.innerHTML = '<div class="coming-soon">Profile view coming soon!</div>';
            
        } catch (err) {
            console.error('Error loading profile:', err);
            contentArea.innerHTML = '<div class="error">Failed to load profile</div>';
        }
    },
    
    async loadAchievements() {
        const contentArea = document.getElementById('content-area');
        const template = document.getElementById('achievements-view');
        contentArea.innerHTML = template.innerHTML;
        
        const grid = document.getElementById('achievements-grid');
        grid.innerHTML = '<div class="loading">Loading badges...</div>';
        
        try {
            const response = await fetch(`/api/gamification/achievements/${this.currentUser}`);
            const achievements = await response.json();
            
            if (achievements.length === 0) {
                grid.innerHTML = '<div class="empty-state">No badges yet. Complete challenges and milestones to earn them!</div>';
                return;
            }
            
            grid.innerHTML = achievements.map(ach => `
                <div class="achievement-badge-card earned">
                    <div class="badge-icon">${ach.icon || '🏆'}</div>
                    <div class="badge-info">
                        <h4 class="badge-name">${ach.name}</h4>
                        <p class="badge-desc">${ach.description}</p>
                        <span class="badge-date">Earned ${new Date(ach.earned_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
            
        } catch (err) {
            console.error('Error loading achievements:', err);
            grid.innerHTML = '<div class="error">Failed to load badges</div>';
        }
    },

    async loadTreasureBox() {
        const contentArea = document.getElementById('content-area');
        const template = document.getElementById('treasure-box-view');
        contentArea.innerHTML = template.innerHTML;
        
        const grid = document.getElementById('library-grid');
        grid.innerHTML = '<div class="loading">Opening your treasure box...</div>';
        
        try {
            const response = await fetch(`/api/gamification/library/${this.currentUser}`);
            const content = await response.json();
            
            if (content.length === 0) {
                grid.innerHTML = '<div class="empty-state">Your treasure box is empty. Open chests to find recaps, simulations, and more!</div>';
                return;
            }
            
            grid.innerHTML = content.map(item => `
                <div class="library-item-card" data-content-id="${item.content_id}">
                    <div class="item-icon">${item.content_id.includes('recap') ? '📖' : '🎮'}</div>
                    <div class="item-info">
                        <h4 class="item-name">${item.content_id.replace(/_/g, ' ').toUpperCase()}</h4>
                        <span class="item-date">Unlocked ${new Date(item.unlocked_at).toLocaleDateString()}</span>
                    </div>
                    <button class="play-btn" onclick="App.playTreasure('${item.content_id}')">Play</button>
                </div>
            `).join('');
            
        } catch (err) {
            console.error('Error loading treasure box:', err);
            grid.innerHTML = '<div class="error">Failed to open treasure box</div>';
        }
    },

    async playTreasure(contentId) {
        console.log('Playing treasure item:', contentId);
        // Logic to launch a mini-quest or recap screen
        if (contentId.includes('recap')) {
            alert(`Opening Recap: ${contentId}. (Implementation: Launching Recap Viewer)`);
        } else {
            alert(`Launching Simulation: ${contentId}.`);
        }
    },

    async openChest(chestId) {
        try {
            const response = await fetch('/api/gamification/chest/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUser, chestId })
            });
            const result = await response.json();
            
            if (result.success) {
                // Show reward animation
                if (window.QuestUI) {
                    result.rewards.forEach(r => {
                        if (r.type === 'coins') window.QuestUI.showCoinAnimation(r.amount);
                        else if (r.type === 'gems') alert(`💎 Found ${r.amount} Gems!`);
                    });
                }
                this.loadUserData(); // Refresh stats
            }
        } catch (err) {
            console.error('Error opening chest:', err);
        }
    }
};

// Loading overlay helpers
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;