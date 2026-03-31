// public/js/components/confetti.js
const ConfettiService = {
    // Create confetti animation
    showConfetti(duration = 2000, intensity = 100) {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        document.body.appendChild(container);
        
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9f4a', '#f093fb', '#4facfe'];
        
        for (let i = 0; i < intensity; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                
                // Random position
                const startX = Math.random() * window.innerWidth;
                const size = Math.random() * 8 + 4;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const rotation = Math.random() * 360;
                const duration = Math.random() * 1.5 + 1;
                
                confetti.style.left = startX + 'px';
                confetti.style.width = size + 'px';
                confetti.style.height = size + 'px';
                confetti.style.background = color;
                confetti.style.transform = `rotate(${rotation}deg)`;
                confetti.style.animationDuration = duration + 's';
                
                container.appendChild(confetti);
                
                // Remove confetti after animation
                setTimeout(() => {
                    if (confetti.parentNode) confetti.remove();
                }, duration * 1000);
            }, i * 15);
        }
        
        // Remove container after all confetti is gone
        setTimeout(() => {
            if (container.parentNode) container.remove();
        }, duration + 500);
    },
    
    // Create fireworks effect
    showFireworks(count = 8) {
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f093fb', '#ff9f4a'];
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const x = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight * 0.7 + window.innerHeight * 0.2;
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                const firework = document.createElement('div');
                firework.className = 'firework';
                firework.style.left = x + 'px';
                firework.style.top = y + 'px';
                firework.style.backgroundColor = color;
                firework.style.boxShadow = `0 0 10px ${color}`;
                
                document.body.appendChild(firework);
                
                setTimeout(() => {
                    if (firework.parentNode) firework.remove();
                }, 1000);
            }, i * 150);
        }
    },
    
    // Full celebration (confetti + fireworks)
    celebrate() {
        this.showFireworks(12);
        setTimeout(() => {
            this.showConfetti(2500, 150);
        }, 300);
    },
    
    // Quick celebration for quest complete
    questComplete() {
        this.showFireworks(8);
        setTimeout(() => {
            this.showConfetti(2000, 100);
        }, 200);
    }
};

window.ConfettiService = ConfettiService;