// public/js/components/confetti.js - Enhanced Version
const ConfettiService = {
    // Create confetti animation
    showConfetti(duration = 3000, intensity = 200) {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 30001; overflow: hidden;';
        document.body.appendChild(container);
        
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9f4a', '#f093fb', '#4facfe', '#ff4d4d', '#4dff4d', '#ff4dff', '#4d4dff', '#ffa64d', '#ff4da6'];
        
        for (let i = 0; i < intensity; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                
                const startX = Math.random() * window.innerWidth;
                const size = Math.random() * 12 + 6;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const rotation = Math.random() * 360;
                const duration = Math.random() * 2 + 1.5;
                const delay = Math.random() * 0.5;
                
                confetti.style.left = startX + 'px';
                confetti.style.width = size + 'px';
                confetti.style.height = size + 'px';
                confetti.style.background = color;
                confetti.style.transform = `rotate(${rotation}deg)`;
                confetti.style.animationDuration = duration + 's';
                confetti.style.animationDelay = delay + 's';
                
                container.appendChild(confetti);
                
                setTimeout(() => {
                    if (confetti.parentNode) confetti.remove();
                }, (duration + delay) * 1000);
            }, i * 10);
        }
        
        setTimeout(() => {
            if (container.parentNode) container.remove();
        }, duration + 1000);
    },
    
    // Enhanced fireworks effect - multiple bursts at once
    showFireworks(count = 15) {
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f093fb', '#ff9f4a', '#ff4d4d', '#4dff4d', '#4d4dff', '#ff4dff', '#ffa500', '#ff1493'];
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                // Create multiple particles per firework
                const particleCount = 24;
                const centerX = Math.random() * window.innerWidth;
                const centerY = Math.random() * window.innerHeight * 0.6 + window.innerHeight * 0.2;
                const mainColor = colors[Math.floor(Math.random() * colors.length)];
                
                for (let p = 0; p < particleCount; p++) {
                    const angle = (p / particleCount) * Math.PI * 2;
                    const distance = Math.random() * 80 + 40;
                    const particleX = centerX + Math.cos(angle) * distance;
                    const particleY = centerY + Math.sin(angle) * distance;
                    
                    const particle = document.createElement('div');
                    particle.className = 'firework-particle';
                    particle.style.cssText = `
                        position: fixed;
                        left: ${particleX}px;
                        top: ${particleY}px;
                        width: 6px;
                        height: 6px;
                        background: ${mainColor};
                        border-radius: 50%;
                        pointer-events: none;
                        z-index: 30001;
                        opacity: 1;
                        box-shadow: 0 0 8px ${mainColor};
                        animation: fireworkBurst 1s ease-out forwards;
                    `;
                    document.body.appendChild(particle);
                    
                    setTimeout(() => {
                        if (particle.parentNode) particle.remove();
                    }, 1000);
                }
            }, i * 200);
        }
    },
    
    // MEGA celebration for challenge complete
    challengeCompleteCelebration() {
        // Continuous fireworks for 5 seconds
        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                this.showFireworks(8);
            }, i * 200);
        }
        
        // Heavy confetti in waves
        setTimeout(() => {
            this.showConfetti(5000, 400);
        }, 100);
        
        setTimeout(() => {
            this.showConfetti(4000, 300);
        }, 1500);
        
        setTimeout(() => {
            this.showConfetti(3500, 250);
        }, 3000);
    },
    
    // Standard celebration for quest complete
    questComplete() {
        this.showFireworks(12);
        setTimeout(() => {
            this.showConfetti(2500, 150);
        }, 200);
        setTimeout(() => {
            this.showFireworks(8);
        }, 800);
    }
};

window.ConfettiService = ConfettiService;