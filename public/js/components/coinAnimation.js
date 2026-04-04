// public/js/components/coinAnimation.js
const CoinAnimation = {
    coinCounter: null,
    currentCoins: 0,
    targetCoins: 0,
    
    init() {
        this.createCoinDisplay();
        this.loadCoinBalance();
    },
    
    createCoinDisplay() {
        // Check if coin display already exists
        if (document.getElementById('animated-coin-display')) return;
        
        const coinDisplay = document.createElement('div');
        coinDisplay.id = 'animated-coin-display';
        coinDisplay.className = 'animated-coin-display';
        coinDisplay.innerHTML = `
            <div class="coin-icon-wrapper">
                <div class="coin-flip-icon">🪙</div>
            </div>
            <div class="coin-balance-wrapper">
                <span class="coin-label">Coins</span>
                <span id="coinBalanceNumber" class="coin-balance-number">0</span>
            </div>
        `;
        
        // Insert into header next to points
        const pointsEl = document.querySelector('.points');
        if (pointsEl && pointsEl.parentNode) {
            pointsEl.parentNode.insertBefore(coinDisplay, pointsEl.nextSibling);
        } else {
            const userStats = document.querySelector('.user-stats');
            if (userStats) userStats.appendChild(coinDisplay);
        }
        
        this.injectStyles();
    },
    
    async loadCoinBalance() {
        const userId = window.App?.currentUser || 'student-001';
        try {
            const response = await fetch(`/api/coins/balance/${userId}`);
            const data = await response.json();
            this.currentCoins = data.balance || 0;
            this.targetCoins = this.currentCoins;
            this.updateDisplay(this.currentCoins);
        } catch (err) {
            console.error('Error loading coin balance:', err);
        }
    },
    
    // Animate coin addition with flipping effect
    async addCoins(amount, sourceElement = null) {
        if (!amount || amount <= 0) return;
        
        this.targetCoins += amount;
        
        // Create flying coin animation from source to counter
        if (sourceElement) {
            await this.createFlyingCoin(sourceElement, amount);
        } else {
            await this.createFloatingCoin(amount);
        }
        
        // Count up animation
        await this.countUpTo(this.targetCoins);
        
        // Play sound
        if (window.MANYAAudioSystem) {
            window.MANYAAudioSystem.playCoinCollect();
        }
    },
    
    // Deduct coins
    async deductCoins(amount) {
        if (!amount || amount <= 0) return;
        
        this.targetCoins -= amount;
        
        // Create deduction effect
        await this.createDeductionEffect(amount);
        
        // Count down animation
        await this.countDownTo(this.targetCoins);
        
        // Play deduction sound
        if (window.MANYAAudioSystem) {
            window.MANYAAudioSystem.playCoinDeduct();
        }
    },
    
    // Create flying coin from source to counter
    createFlyingCoin(sourceElement, amount) {
        return new Promise((resolve) => {
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetRect = document.getElementById('animated-coin-display').getBoundingClientRect();
            
            const flyingCoin = document.createElement('div');
            flyingCoin.className = 'flying-coin';
            flyingCoin.innerHTML = '🪙';
            flyingCoin.style.cssText = `
                position: fixed;
                left: ${sourceRect.left + sourceRect.width / 2}px;
                top: ${sourceRect.top + sourceRect.height / 2}px;
                font-size: 28px;
                z-index: 20000;
                pointer-events: none;
                transition: all 0.6s cubic-bezier(0.34, 1.2, 0.64, 1);
            `;
            
            document.body.appendChild(flyingCoin);
            
            // Add value indicator
            const valueIndicator = document.createElement('div');
            valueIndicator.className = 'coin-value-indicator';
            valueIndicator.textContent = `+${amount}`;
            valueIndicator.style.cssText = `
                position: fixed;
                left: ${sourceRect.left + sourceRect.width / 2}px;
                top: ${sourceRect.top + sourceRect.height / 2 - 20}px;
                font-size: 18px;
                font-weight: bold;
                color: gold;
                z-index: 20001;
                pointer-events: none;
                animation: coinValueFloat 0.8s ease-out forwards;
            `;
            document.body.appendChild(valueIndicator);
            
            // Animate flying coin
            setTimeout(() => {
                flyingCoin.style.left = `${targetRect.left + targetRect.width / 2}px`;
                flyingCoin.style.top = `${targetRect.top + targetRect.height / 2}px`;
                flyingCoin.style.transform = 'rotate(720deg) scale(0.5)';
                flyingCoin.style.opacity = '0.8';
            }, 10);
            
            setTimeout(() => {
                flyingCoin.remove();
                valueIndicator.remove();
                // Shake the coin display
                const display = document.getElementById('animated-coin-display');
                if (display) {
                    display.classList.add('coin-shake');
                    setTimeout(() => display.classList.remove('coin-shake'), 300);
                }
                resolve();
            }, 600);
        });
    },
    
    // Create floating coin animation
    createFloatingCoin(amount) {
        return new Promise((resolve) => {
            const targetRect = document.getElementById('animated-coin-display').getBoundingClientRect();
            
            // Create multiple floating coins
            for (let i = 0; i < 3; i++) {
                const floatingCoin = document.createElement('div');
                floatingCoin.className = 'floating-coin';
                floatingCoin.innerHTML = '🪙';
                floatingCoin.style.cssText = `
                    position: fixed;
                    left: ${targetRect.left + targetRect.width / 2 + (Math.random() - 0.5) * 50}px;
                    bottom: ${targetRect.top - 20}px;
                    font-size: ${20 + Math.random() * 15}px;
                    z-index: 20000;
                    pointer-events: none;
                    animation: coinFloatUp ${0.5 + Math.random() * 0.5}s ease-out forwards;
                `;
                document.body.appendChild(floatingCoin);
                
                setTimeout(() => floatingCoin.remove(), 1000);
            }
            
            // Add value indicator
            const valueIndicator = document.createElement('div');
            valueIndicator.className = 'coin-value-indicator';
            valueIndicator.textContent = `+${amount}`;
            valueIndicator.style.cssText = `
                position: fixed;
                left: ${targetRect.left + targetRect.width / 2}px;
                bottom: ${targetRect.top}px;
                font-size: 20px;
                font-weight: bold;
                color: gold;
                z-index: 20001;
                pointer-events: none;
                animation: coinValueRise 0.8s ease-out forwards;
            `;
            document.body.appendChild(valueIndicator);
            
            setTimeout(() => {
                valueIndicator.remove();
                resolve();
            }, 800);
        });
    },
    
    // Create deduction effect
    createDeductionEffect(amount) {
        return new Promise((resolve) => {
            const targetRect = document.getElementById('animated-coin-display').getBoundingClientRect();
            
            const valueIndicator = document.createElement('div');
            valueIndicator.className = 'coin-value-indicator deduct';
            valueIndicator.textContent = `-${amount}`;
            valueIndicator.style.cssText = `
                position: fixed;
                left: ${targetRect.left + targetRect.width / 2}px;
                top: ${targetRect.top}px;
                font-size: 20px;
                font-weight: bold;
                color: #ff6b6b;
                z-index: 20001;
                pointer-events: none;
                animation: coinValueDrop 0.6s ease-out forwards;
            `;
            document.body.appendChild(valueIndicator);
            
            // Shake effect
            const display = document.getElementById('animated-coin-display');
            if (display) {
                display.classList.add('coin-shake-deduct');
                setTimeout(() => display.classList.remove('coin-shake-deduct'), 300);
            }
            
            setTimeout(() => {
                valueIndicator.remove();
                resolve();
            }, 600);
        });
    },
    
    // Count up animation
    countUpTo(target) {
        return new Promise((resolve) => {
            const start = this.currentCoins;
            const end = target;
            const duration = 800;
            const startTime = performance.now();
            const numberElement = document.getElementById('coinBalanceNumber');
            
            if (!numberElement) {
                this.currentCoins = end;
                resolve();
                return;
            }
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.floor(start + (end - start) * easeOutCubic);
                
                numberElement.textContent = currentValue.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    numberElement.textContent = end.toLocaleString();
                    this.currentCoins = end;
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    },
    
    // Count down animation
    countDownTo(target) {
        return new Promise((resolve) => {
            const start = this.currentCoins;
            const end = target;
            const duration = 600;
            const startTime = performance.now();
            const numberElement = document.getElementById('coinBalanceNumber');
            
            if (!numberElement) {
                this.currentCoins = end;
                resolve();
                return;
            }
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.max(end, Math.floor(start - (start - end) * easeOutCubic));
                
                numberElement.textContent = currentValue.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    numberElement.textContent = end.toLocaleString();
                    this.currentCoins = end;
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    },
    
    updateDisplay(balance) {
        const numberElement = document.getElementById('coinBalanceNumber');
        if (numberElement) {
            numberElement.textContent = balance.toLocaleString();
            this.currentCoins = balance;
            this.targetCoins = balance;
        }
    },
    
    injectStyles() {
        if (document.getElementById('coin-animation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'coin-animation-styles';
        style.textContent = `
            .animated-coin-display {
                display: flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                padding: 6px 15px;
                border-radius: 40px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                transition: all 0.3s;
            }
            
            .coin-icon-wrapper {
                animation: coinIdle 2s ease-in-out infinite;
            }
            
            .coin-flip-icon {
                font-size: 1.5em;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            }
            
            @keyframes coinIdle {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-3px) rotate(5deg); }
            }
            
            .coin-balance-wrapper {
                text-align: center;
            }
            
            .coin-label {
                font-size: 0.7em;
                color: #92400e;
                display: block;
                line-height: 1;
            }
            
            .coin-balance-number {
                font-size: 1.2em;
                font-weight: bold;
                color: #b45309;
                line-height: 1;
            }
            
            .coin-shake {
                animation: coinShake 0.3s ease-in-out;
            }
            
            .coin-shake-deduct {
                animation: coinShakeRed 0.3s ease-in-out;
            }
            
            @keyframes coinShake {
                0%, 100% { transform: translateX(0); background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
                25% { transform: translateX(-5px); background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%); }
                75% { transform: translateX(5px); background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%); }
            }
            
            @keyframes coinShakeRed {
                0%, 100% { transform: translateX(0); background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
                25% { transform: translateX(-5px); background: linear-gradient(135deg, #fed7d7 0%, #fc8181 100%); }
                75% { transform: translateX(5px); background: linear-gradient(135deg, #fed7d7 0%, #fc8181 100%); }
            }
            
            @keyframes coinFloatUp {
                0% {
                    opacity: 1;
                    transform: translateY(0) rotate(0deg);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-100px) rotate(360deg);
                }
            }
            
            @keyframes coinValueFloat {
                0% {
                    opacity: 1;
                    transform: translateY(0) scale(0.8);
                }
                50% {
                    transform: translateY(-30px) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-60px) scale(1);
                }
            }
            
            @keyframes coinValueRise {
                0% {
                    opacity: 0;
                    transform: translateY(0) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translateY(-20px) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-50px) scale(1);
                }
            }
            
            @keyframes coinValueDrop {
                0% {
                    opacity: 0;
                    transform: translateY(0) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translateY(20px) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: translateY(50px) scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
};

window.CoinAnimation = CoinAnimation;