// public/js/components/likeButton.js
const LikeButtonSystem = {
    consecutiveCorrect: 0,
    likeButton: null,
    isAnimating: false,
    initialized: false,
    
    init() {
        if (this.initialized) return;
        this.injectStyles();
        this.initialized = true;
        console.log('👍 Like Button System initialized');
    },
    
    // Track consecutive correct answers
    recordCorrect() {
        this.consecutiveCorrect++;
        console.log(`👍 Consecutive correct answers: ${this.consecutiveCorrect}`);
        
        if (this.consecutiveCorrect === 2 && !this.isAnimating) {
            this.showLikeButton();
        }
    },
    
    // Reset on wrong answer
    reset() {
        this.consecutiveCorrect = 0;
        this.hideLikeButton();
    },
    
    // Show floating like button
    showLikeButton() {
        if (this.likeButton) return;
        
        this.isAnimating = true;
        
        // Create like button
        this.likeButton = document.createElement('div');
        this.likeButton.className = 'floating-like-button';
        this.likeButton.innerHTML = `
            <div class="like-button-inner">
                <span class="like-icon">👍</span>
                <span class="like-text">Great Streak!</span>
                <span class="like-sparkle">✨</span>
            </div>
        `;
        
        document.body.appendChild(this.likeButton);
        
        // Add click handler
        this.likeButton.addEventListener('click', () => this.triggerLikeReaction());
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideLikeButton();
        }, 5000);
    },
    
    // Hide like button
    hideLikeButton() {
        if (this.likeButton) {
            this.likeButton.classList.add('fade-out');
            setTimeout(() => {
                if (this.likeButton && this.likeButton.parentNode) {
                    this.likeButton.remove();
                    this.likeButton = null;
                }
                this.isAnimating = false;
            }, 300);
        }
    },
    
    // Trigger like reaction with effects
    triggerLikeReaction() {
        console.log('❤️ User liked the streak!');
        
        // Play sound
        if (window.MANYAAudioSystem) {
            window.MANYAAudioSystem.play('magic', 0.5);
        }
        
        // Create heart particles
        this.createHeartParticles();
        
        // Award bonus coins
        this.awardBonusCoins();
        
        // Show celebration message
        this.showCelebrationMessage();
        
        // Hide button after click
        this.hideLikeButton();
        
        // Reset consecutive counter after bonus
        this.consecutiveCorrect = 0;
    },
    
    // Create floating heart particles
    createHeartParticles() {
        const heartCount = 15;
        const colors = ['#ff6b6b', '#ff4d4d', '#ff3333', '#ff1a1a', '#ff0000'];
        
        for (let i = 0; i < heartCount; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart-particle';
            heart.innerHTML = Math.random() > 0.5 ? '❤️' : '💖';
            heart.style.cssText = `
                position: fixed;
                left: ${this.likeButton ? this.likeButton.getBoundingClientRect().left + this.likeButton.offsetWidth / 2 : window.innerWidth / 2}px;
                top: ${this.likeButton ? this.likeButton.getBoundingClientRect().top : window.innerHeight / 2}px;
                font-size: ${20 + Math.random() * 20}px;
                pointer-events: none;
                z-index: 20001;
                animation: heartFloat ${1 + Math.random() * 0.5}s ease-out forwards;
                color: ${colors[Math.floor(Math.random() * colors.length)]};
                filter: drop-shadow(0 0 5px currentColor);
            `;
            document.body.appendChild(heart);
            
            setTimeout(() => heart.remove(), 1500);
        }
        
        // Add mini confetti burst
        if (window.canvasConfetti) {
            canvasConfetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.7 },
                colors: ['#ff6b6b', '#ff4d4d', '#ff9999', '#ffcccc']
            });
        }
    },
    
    // Award bonus coins for liking
    async awardBonusCoins() {
        const userId = window.App?.currentUser || 'student-001';
        const bonusAmount = 5;
        
        console.log(`💰 Awarding ${bonusAmount} bonus coins for like!`);
        
        // Update coin animation
        if (window.CoinAnimation) {
            await window.CoinAnimation.addCoins(bonusAmount, this.likeButton);
        }
        
        // Update backend
        try {
            await fetch('/api/coins/bonus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: bonusAmount, reason: 'streak_like' })
            });
        } catch (err) {
            console.error('Error awarding bonus coins:', err);
        }
        
        // Show bonus notification
        this.showBonusNotification(bonusAmount);
    },
    
    // Show bonus notification
    showBonusNotification(amount) {
        const notification = document.createElement('div');
        notification.className = 'bonus-notification';
        notification.innerHTML = `
            <div class="bonus-content">
                <span class="bonus-icon">🎁</span>
                <span class="bonus-text">+${amount} Bonus Coins!</span>
                <span class="bonus-emoji">🎉</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    },
    
    // Show celebration message
    showCelebrationMessage() {
        const messages = [
            "🔥 Streak Power!",
            "💪 You're on fire!",
            "🌟 Amazing focus!",
            "🎯 Keep it up!",
            "⭐ Perfect streak!",
            "🏆 You're crushing it!"
        ];
        
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'streak-celebration';
        msgDiv.innerHTML = `
            <div class="streak-celebration-content">
                <span class="streak-icon">⚡</span>
                <span class="streak-message">${message}</span>
            </div>
        `;
        document.body.appendChild(msgDiv);
        
        setTimeout(() => {
            msgDiv.classList.add('fade-out');
            setTimeout(() => msgDiv.remove(), 300);
        }, 1500);
    },
    
    injectStyles() {
        if (document.getElementById('like-button-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'like-button-styles';
        style.textContent = `
            .floating-like-button {
                position: fixed;
                bottom: 120px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 60px;
                padding: 12px 24px;
                cursor: pointer;
                z-index: 10000;
                animation: likeFloatIn 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                border: 2px solid rgba(255,255,255,0.3);
                transition: transform 0.2s;
            }
            
            .floating-like-button:hover {
                transform: scale(1.08);
                box-shadow: 0 15px 40px rgba(0,0,0,0.4);
            }
            
            .like-button-inner {
                display: flex;
                align-items: center;
                gap: 10px;
                color: white;
                font-weight: bold;
            }
            
            .like-icon {
                font-size: 1.5em;
                animation: likePulse 1s infinite;
            }
            
            .like-text {
                font-size: 0.9em;
                letter-spacing: 1px;
            }
            
            .like-sparkle {
                font-size: 1.2em;
                animation: sparkle 0.5s infinite alternate;
            }
            
            .floating-like-button.fade-out {
                animation: likeFloatOut 0.3s ease-out forwards;
            }
            
            @keyframes likeFloatIn {
                0% {
                    opacity: 0;
                    transform: translateX(100px) scale(0.5);
                }
                70% {
                    transform: translateX(-10px) scale(1.05);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }
            
            @keyframes likeFloatOut {
                to {
                    opacity: 0;
                    transform: translateX(100px) scale(0.5);
                }
            }
            
            @keyframes likePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            @keyframes sparkle {
                0% { opacity: 0.5; transform: scale(0.8); }
                100% { opacity: 1; transform: scale(1.2); }
            }
            
            .heart-particle {
                position: fixed;
                pointer-events: none;
                z-index: 20001;
                animation: heartFloat 1s ease-out forwards;
            }
            
            @keyframes heartFloat {
                0% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-100px) scale(0.5);
                }
            }
            
            .bonus-notification {
                position: fixed;
                top: 30%;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                color: #78350f;
                padding: 12px 24px;
                border-radius: 60px;
                z-index: 10001;
                animation: bonusPop 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                font-weight: bold;
            }
            
            .bonus-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .bonus-icon {
                font-size: 1.5em;
            }
            
            .bonus-text {
                font-size: 1.1em;
            }
            
            .bonus-emoji {
                font-size: 1.2em;
                animation: bounce 0.5s ease;
            }
            
            @keyframes bonusPop {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.5);
                }
                50% {
                    transform: translateX(-50%) scale(1.1);
                }
                100% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1);
                }
            }
            
            .streak-celebration {
                position: fixed;
                top: 40%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                padding: 15px 30px;
                border-radius: 60px;
                z-index: 10002;
                animation: streakPop 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
                border: 2px solid gold;
            }
            
            .streak-celebration-content {
                display: flex;
                align-items: center;
                gap: 12px;
                color: white;
            }
            
            .streak-icon {
                font-size: 1.5em;
                animation: lightning 0.5s infinite alternate;
            }
            
            .streak-message {
                font-size: 1.2em;
                font-weight: bold;
                background: linear-gradient(135deg, gold, #ffd966);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
            }
            
            @keyframes streakPop {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.3);
                }
                50% {
                    transform: translateX(-50%) scale(1.1);
                }
                100% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1);
                }
            }
            
            @keyframes lightning {
                0% { opacity: 0.6; transform: scale(1); }
                100% { opacity: 1; transform: scale(1.2); text-shadow: 0 0 10px gold; }
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            
            .fade-out {
                animation: fadeOutAnim 0.3s ease-out forwards;
            }
            
            @keyframes fadeOutAnim {
                to {
                    opacity: 0;
                    transform: scale(0.8);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
};

window.LikeButtonSystem = LikeButtonSystem;