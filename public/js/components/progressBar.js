// public/js/components/progressBar.js
const ProgressBarSystem = {
    currentProgress: 0,
    targetProgress: 0,
    animationId: null,
    
    init() {
        this.createProgressBar();
        this.injectStyles();
    },
    
    createProgressBar() {
        // Check if progress bar already exists
        if (document.getElementById('mastery-progress-container')) return;
        
        // Find or create container
        let targetContainer = null;
        let isCompact = false;
        
        if (this.containerId) {
            targetContainer = document.getElementById(this.containerId);
            isCompact = true;
        }
        
        if (!targetContainer) {
            targetContainer = document.querySelector('.gameplay-area');
        }
        
        if (!targetContainer) return;
        
        const progressContainer = document.createElement('div');
        progressContainer.id = 'mastery-progress-container';
        progressContainer.className = isCompact ? 'mastery-progress-container compact' : 'mastery-progress-container';
        progressContainer.innerHTML = `
            <div class="progress-header">
                <span class="progress-label">🏆 Quest Mastery Progress</span>
                <span class="progress-percentage" id="mastery-percentage">0%</span>
            </div>
            <div class="progress-bar-wrapper">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" id="mastery-progress-fill" style="width: 0%;">
                        <div class="progress-glow"></div>
                    </div>
                </div>
                <div class="progress-milestones">
                    <div class="milestone" data-percent="25">25%</div>
                    <div class="milestone" data-percent="50">50%</div>
                    <div class="milestone" data-percent="75">75%</div>
                    <div class="milestone" data-percent="100">100%</div>
                </div>
            </div>
            <div class="progress-stats">
                <div class="stat-item">
                    <span class="stat-icon">✅</span>
                    <span id="correct-count" class="stat-value">0</span>
                    <span class="stat-label">Correct</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <span class="stat-icon">📝</span>
                    <span id="total-count" class="stat-value">0</span>
                    <span class="stat-label">Total</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <span class="stat-icon">💪</span>
                    <span id="streak-count-display" class="stat-value">0</span>
                    <span class="stat-label">Streak</span>
                </div>
            </div>
        `;
        
        // Insert at target container
        if (isCompact) {
            targetContainer.innerHTML = '';
            targetContainer.appendChild(progressContainer);
        } else {
            const questionCard = targetContainer.querySelector('.question-card');
            if (questionCard) {
                targetContainer.insertBefore(progressContainer, questionCard);
            } else {
                targetContainer.insertBefore(progressContainer, targetContainer.firstChild);
            }
        }
    },
    
    updateProgress(correctCount, totalCount, streakCount = 0) {
        const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
        this.targetProgress = percentage;
        
        // Update text stats
        const correctEl = document.getElementById('correct-count');
        const totalEl = document.getElementById('total-count');
        const streakEl = document.getElementById('streak-count-display');
        const percentageEl = document.getElementById('mastery-percentage');
        
        if (correctEl) correctEl.textContent = correctCount;
        if (totalEl) totalEl.textContent = totalCount;
        if (streakEl) streakEl.textContent = streakCount;
        if (percentageEl) percentageEl.textContent = `${percentage}%`;
        
        // Animate progress bar
        this.animateProgressBar(percentage);
        
        // Trigger milestone celebrations
        this.checkMilestones(percentage);
    },
    
    animateProgressBar(targetPercentage) {
        const progressFill = document.getElementById('mastery-progress-fill');
        if (!progressFill) return;
        
        const startPercentage = this.currentProgress;
        const duration = 800;
        const startTime = performance.now();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = startPercentage + (targetPercentage - startPercentage) * easeOutCubic;
            
            progressFill.style.width = `${currentValue}%`;
            
            // Add pulsing effect when passing milestones
            if (Math.floor(currentValue) > Math.floor(this.currentProgress) && 
                Math.floor(currentValue) % 25 === 0 && 
                currentValue > 0) {
                this.addMilestonePulse(currentValue);
            }
            
            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                progressFill.style.width = `${targetPercentage}%`;
                this.currentProgress = targetPercentage;
                this.animationId = null;
                
                // Celebration at 100%
                if (targetPercentage >= 100) {
                    this.celebrateComplete();
                }
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    },
    
// Replace the addMilestonePulse method
addMilestonePulse(percentage) {
    const progressFill = document.getElementById('mastery-progress-fill');
    if (!progressFill) return;
    
    progressFill.classList.add('milestone-pulse');
    setTimeout(() => {
        progressFill.classList.remove('milestone-pulse');
    }, 500);
    
    // Play milestone sound - FIXED: use playCorrect or playClick instead of play()
    if (window.MANYAAudioSystem) {
        // Use existing method instead of non-existent play()
        if (window.MANYAAudioSystem.playCorrect) {
            window.MANYAAudioSystem.playCorrect();
        } else if (window.MANYAAudioSystem.playClick) {
            window.MANYAAudioSystem.playClick();
        }
    }
    
    // Show milestone notification
    this.showMilestoneNotification(percentage);
},
    
    showMilestoneNotification(percentage) {
        const notification = document.createElement('div');
        notification.className = 'milestone-notification';
        notification.innerHTML = `
            <div class="milestone-content">
                <span class="milestone-icon">🎯</span>
                <span class="milestone-text">${percentage}% Mastery!</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    },
    
    checkMilestones(percentage) {
        const milestones = [25, 50, 75, 100];
        for (const milestone of milestones) {
            if (this.currentProgress < milestone && percentage >= milestone) {
                this.showMilestoneCelebration(milestone);
            }
        }
    },
    
    showMilestoneCelebration(milestone) {
        // Create mini confetti for milestone
        if (window.canvasConfetti) {
            canvasConfetti({
                particleCount: 30,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#ffd700', '#48bb78', '#9f7aea']
            });
        }
        
        // Show milestone message
        const milestoneMsg = document.createElement('div');
        milestoneMsg.className = 'milestone-celebration';
        milestoneMsg.innerHTML = `
            <div class="milestone-celebration-content">
                <span class="milestone-emoji">🏆</span>
                <span class="milestone-title">${milestone}% Mastery!</span>
                <span class="milestone-desc">Keep going!</span>
            </div>
        `;
        document.body.appendChild(milestoneMsg);
        
        setTimeout(() => {
            milestoneMsg.remove();
        }, 2000);
    },
    
// Update the celebrateComplete method in progressBar.js
celebrateComplete() {
    // Create celebration effect - but NO mastery card
    const celebration = document.createElement('div');
    celebration.className = 'progress-complete-celebration';
    celebration.innerHTML = `
        <div class="complete-burst">✨</div>
        <div class="complete-burst">🎉</div>
        <div class="complete-burst">🏆</div>
        <div class="complete-burst">⭐</div>
    `;
    document.body.appendChild(celebration);
    
    if (window.canvasConfetti) {
        canvasConfetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ffd700', '#48bb78', '#9f7aea', '#ff6b6b']
        });
    }
    
    setTimeout(() => celebration.remove(), 1500);
},
    
    reset() {
        this.currentProgress = 0;
        this.targetProgress = 0;
        const progressFill = document.getElementById('mastery-progress-fill');
        if (progressFill) progressFill.style.width = '0%';
        
        const correctEl = document.getElementById('correct-count');
        const totalEl = document.getElementById('total-count');
        const percentageEl = document.getElementById('mastery-percentage');
        
        if (correctEl) correctEl.textContent = '0';
        if (totalEl) totalEl.textContent = '0';
        if (percentageEl) percentageEl.textContent = '0%';
    },
    
    injectStyles() {
        if (document.getElementById('progress-bar-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'progress-bar-styles';
        style.textContent = `
                .mastery-progress-container {
                    background: white;
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 25px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                }
                
                .mastery-progress-container.compact {
                    padding: 8px 12px;
                    margin-bottom: 0;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                }
                
                .mastery-progress-container.compact .progress-header {
                    margin-bottom: 4px;
                }
                
                .mastery-progress-container.compact .progress-label {
                    font-size: 0.75em;
                }
                
                .mastery-progress-container.compact .progress-percentage {
                    font-size: 0.9em;
                }
                
                .mastery-progress-container.compact .progress-bar-bg {
                    height: 6px;
                }
                
                .mastery-progress-container.compact .progress-milestones {
                    margin-top: 2px;
                    padding: 0 2px;
                }
                
                .mastery-progress-container.compact .milestone {
                    font-size: 0.6em;
                }
                
                .mastery-progress-container.compact .progress-stats {
                    margin-top: 4px;
                    padding-top: 4px;
                }
                
                .mastery-progress-container.compact .stat-item {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                }
                
                .mastery-progress-container.compact .stat-icon {
                    font-size: 0.8em;
                    margin-right: 0;
                }
                
                .mastery-progress-container.compact .stat-value {
                    font-size: 0.85em;
                }
                
                .mastery-progress-container.compact .stat-label {
                    font-size: 0.65em;
                    margin-left: 0;
                }
                
                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin-bottom: 12px;
                }
                
                .progress-label {
                    font-size: 0.9em;
                    font-weight: 600;
                    color: #4a5568;
                }
                
                .progress-percentage {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #667eea;
                }
                
                .progress-bar-wrapper {
                    margin-bottom: 15px;
                }
                
                .mastery-progress-container.compact .progress-bar-wrapper {
                    margin-bottom: 5px;
                }
                
                .progress-bar-bg {
                    background: #e2e8f0;
                    border-radius: 20px;
                    overflow: hidden;
                    height: 12px;
                    position: relative;
                }
                
                .progress-bar-fill {
                    background: linear-gradient(90deg, #48bb78, #667eea, #9f7aea);
                    border-radius: 20px;
                    height: 100%;
                    width: 0%;
                    transition: width 0.1s linear;
                    position: relative;
                    overflow: hidden;
                }
                
                .progress-glow {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: progressShimmer 2s infinite;
                }
                
                @keyframes progressShimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .progress-bar-fill.milestone-pulse {
                    animation: milestonePulse 0.5s ease-out;
                }
                
                @keyframes milestonePulse {
                    0% { filter: brightness(1); }
                    50% { filter: brightness(1.5); box-shadow: 0 0 20px rgba(72,187,120,0.5); }
                    100% { filter: brightness(1); }
                }
                
                .progress-milestones {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                    padding: 0 5px;
                }
                
                .milestone {
                    font-size: 0.7em;
                    color: #a0aec0;
                    position: relative;
                }
                
                .milestone::before {
                    content: '';
                    position: absolute;
                    top: -15px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 2px;
                    height: 8px;
                    background: #cbd5e0;
                }
                
                .progress-stats {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 15px;
                    padding-top: 12px;
                    border-top: 1px solid #e2e8f0;
                }
                
                .stat-item {
                    text-align: center;
                    flex: 1;
                }
                
                .stat-icon {
                    font-size: 1.1em;
                    margin-right: 5px;
                }
                
                .stat-value {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #2d3748;
                }
                
                .stat-label {
                    font-size: 0.7em;
                    color: #718096;
                    margin-left: 5px;
                }
                
                .stat-divider {
                    width: 1px;
                    background: #e2e8f0;
                }
                
                .milestone-notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 40px;
                    z-index: 10000;
                    animation: slideInRight 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                }
                
                .milestone-celebration {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(10px);
                    padding: 20px 40px;
                    border-radius: 60px;
                    z-index: 20000;
                    animation: milestonePop 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
                    text-align: center;
                }
                
                .milestone-celebration-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }
                
                .milestone-emoji {
                    font-size: 2.5em;
                }
                
                .milestone-title {
                    font-size: 1.5em;
                    font-weight: bold;
                    color: #fbbf24;
                }
                
                .milestone-desc {
                    font-size: 0.9em;
                    color: white;
                }
                
                .progress-complete-celebration {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    z-index: 20001;
                    animation: burstPop 0.8s ease-out forwards;
                }
                
                .complete-burst {
                    position: absolute;
                    font-size: 2em;
                    animation: burstFly 0.8s ease-out forwards;
                }
                
                .complete-burst:nth-child(1) { top: -50px; left: -50px; animation-delay: 0s; }
                .complete-burst:nth-child(2) { top: -50px; right: -50px; animation-delay: 0.1s; }
                .complete-burst:nth-child(3) { bottom: -50px; left: -50px; animation-delay: 0.2s; }
                .complete-burst:nth-child(4) { bottom: -50px; right: -50px; animation-delay: 0.3s; }
                
                @keyframes burstFly {
                    0% {
                        opacity: 0;
                        transform: scale(0);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.5);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0);
                    }
                }
                
                @keyframes milestonePop {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.1);
                    }
                    100% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @media (max-width: 768px) {
                    .mastery-progress-container {
                        padding: 15px;
                    }
                    .stat-value {
                        font-size: 1em;
                    }
                    .stat-label {
                        font-size: 0.6em;
                    }
                    .milestone {
                        font-size: 0.6em;
                    }
                }
        `;
        
        document.head.appendChild(style);
    }
};

window.ProgressBarSystem = ProgressBarSystem;