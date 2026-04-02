// public/js/components/challengeCelebration.js
const ChallengeCelebration = {
    active: false,
    celebrationAudio: null,
    confettiInterval: null,
    
    show() {
        if (this.active) return;
        this.active = true;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'challenge-celebration-overlay';
        overlay.className = 'challenge-celebration-overlay';
        overlay.innerHTML = `
            <div class="bg-rays"></div>
            
            <!-- Step 1: Sequential Validation (Behavioral Reinforcement) -->
            <div class="checklist-container">
                <div id="challenge-checklist" class="checklist-items"></div>
            </div>

            <!-- Step 2: The Mega Reward (Emotional Peak) -->
            <div class="epic-pulse">
                <h2 class="challenge-subtitle">CHALLENGE</h2>
                <h1 class="challenge-title gold-gradient">COMPLETE</h1>
            </div>

            <!-- Step 3: Social Status Rank (Dopamine High) -->
            <div class="reward-stats">
                <div class="stat-card">
                    <div class="stat-label">BONUS XP GAINED</div>
                    <div id="xp-counter" class="stat-value">0</div>
                </div>
                
                <div class="medal-container">
                    <div class="medal-glow"></div>
                    <img src="/multimedia_assets/gems/master_gem.svg" class="medal-icon" alt="Master Gem">
                </div>

                <div class="stat-card">
                    <div class="stat-label">MASTERY RANK</div>
                    <div class="stat-value gold-gradient">ELITE</div>
                </div>
            </div>

            <button id="proceed-to-chapter" class="proceed-btn">
                PROCEED TO NEXT CHAPTER
            </button>
            <button id="skip-celebration" class="skip-celebration-btn" style="display: none;">
                Skip Celebration →
            </button>
        `;
        
        document.body.appendChild(overlay);
        
        // Add styles
        this.injectStyles();
        
        // Start celebration
        this.startCelebration();
        
        // Handle proceed button
        const proceedBtn = overlay.querySelector('#proceed-to-chapter');
        proceedBtn.onclick = () => {
            this.stop();
            if (window.ChallengesScreen) {
                window.ChallengesScreen.loadTopic('Musculo-Skeletal System');
            }
        };
        
        // Handle skip button
        const skipBtn = overlay.querySelector('#skip-celebration');
        skipBtn.onclick = () => {
            this.stop();
            if (window.ChallengesScreen) {
                window.ChallengesScreen.loadTopic('Musculo-Skeletal System');
            }
        };
        
        // Show skip button after 35 seconds
        setTimeout(() => {
            if (skipBtn) skipBtn.style.display = 'block';
        }, 35000);
    },
    
    startCelebration() {
        // Play the full celebration audio
        this.celebrationAudio = new Audio('/multimedia_assets/audios/challenge_complete/complete.mp3');
        this.celebrationAudio.volume = 0.9;
        this.celebrationAudio.play().catch(e => console.log('Audio error:', e));
        
        // Build the checklist items
        this.buildChecklist();
        
        // Start endless confetti
        this.startEndlessConfetti();
        
        // XP Counter Ticker
        setTimeout(() => {
            this.startXPCounter();
        }, 2000);
        
        // Screen shakes on each quest validation
        this.addScreenShakes();
        
        // Additional fireworks bursts
        this.addFireworkBursts();
    },
    
    buildChecklist() {
        const checklist = document.getElementById('challenge-checklist');
        if (!checklist) return;
        
        const quests = ['Skeletal System', 'Muscular System', 'Joints & Movement', 'Bone Structure', 'Muscle Types'];
        
        quests.forEach((quest, index) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.className = "quest-card";
                item.innerHTML = `
                    <div class="quest-name">${quest}</div>
                    <div class="quest-status">✓ VALIDATED</div>
                `;
                checklist.appendChild(item);
                this.playTick();
                
                // Minor screen shake on each check
                document.body.classList.add('shake');
                setTimeout(() => document.body.classList.remove('shake'), 100);
            }, (index + 1) * 300);
        });
    },
    
    playTick() {
        try {
            const tick = new Audio('/multimedia_assets/audios/ui-click.mp3');
            tick.volume = 0.2;
            tick.play().catch(() => {});
        } catch (err) {}
    },
    
    startEndlessConfetti() {
        const colors = ['#ffcc00', '#ffffff', '#00ff88', '#9f7aea', '#ff6b6b', '#4ecdc4'];
        const endTime = Date.now() + 50000; // 50 seconds
        
        const frame = () => {
            // Launch from sides
            canvasConfetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            canvasConfetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });
            
            // Randomized Fireworks (Burst effect)
            if (Math.random() > 0.92) {
                canvasConfetti({
                    particleCount: 80,
                    startVelocity: 35,
                    spread: 360,
                    origin: { 
                        x: Math.random(), 
                        y: Math.random() - 0.2 
                    },
                    colors: colors,
                    shapes: ['circle', 'square'],
                    gravity: 0.8,
                    scalar: 1.5,
                    decay: 0.9
                });
            }
            
            if (Date.now() < endTime && this.active) {
                requestAnimationFrame(frame);
            }
        };
        
        frame();
    },
    
    startXPCounter() {
        let xp = 0;
        const target = 15500;
        const el = document.getElementById('xp-counter');
        if (!el) return;
        
        const interval = setInterval(() => {
            xp += Math.floor(Math.random() * 250) + 100;
            if (xp >= target) {
                xp = target;
                clearInterval(interval);
            }
            el.innerText = xp.toLocaleString();
        }, 20);
    },
    
    addScreenShakes() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                document.body.classList.add('shake');
                setTimeout(() => document.body.classList.remove('shake'), 150);
            }, (i + 1) * 600);
        }
    },
    
    addFireworkBursts() {
        const colors = ['#ffcc00', '#00ff88', '#9f7aea', '#ff6b6b'];
        
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                canvasConfetti({
                    particleCount: 120,
                    spread: 100,
                    origin: { 
                        x: Math.random(), 
                        y: Math.random() * 0.6 + 0.2 
                    },
                    colors: colors,
                    startVelocity: 25,
                    decay: 0.9,
                    ticks: 200
                });
            }, i * 800);
        }
    },
    
    stop() {
        this.active = false;
        if (this.celebrationAudio) {
            this.celebrationAudio.pause();
            this.celebrationAudio.currentTime = 0;
            this.celebrationAudio = null;
        }
        const overlay = document.getElementById('challenge-celebration-overlay');
        if (overlay) overlay.remove();
    },
    
    injectStyles() {
        if (document.getElementById('challenge-celebration-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'challenge-celebration-styles';
        style.textContent = `
            .challenge-celebration-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%);
                z-index: 50000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                overflow-y: auto;
                padding: 20px;
                animation: fadeIn 0.5s ease;
            }
            
            .bg-rays {
                position: fixed;
                inset: -50%;
                width: 200%;
                height: 200%;
                background: conic-gradient(
                    from 0deg, 
                    transparent 0deg, 
                    rgba(255, 221, 0, 0.12) 10deg, 
                    transparent 20deg,
                    rgba(255, 221, 0, 0.12) 30deg,
                    transparent 40deg
                );
                animation: rotateRays 15s linear infinite;
                z-index: 0;
            }
            
            @keyframes rotateRays {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .checklist-container {
                position: relative;
                z-index: 10;
                margin-bottom: 40px;
            }
            
            .checklist-items {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 15px;
            }
            
            .quest-card {
                background: rgba(72, 187, 120, 0.2);
                border: 1px solid #48bb78;
                padding: 12px 20px;
                border-radius: 12px;
                text-align: center;
                min-width: 120px;
                animation: popIn 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
                transform: scale(0);
            }
            
            .quest-name {
                font-size: 12px;
                color: #fff;
                font-weight: 600;
            }
            
            .quest-status {
                font-size: 10px;
                color: #48bb78;
                margin-top: 4px;
            }
            
            @keyframes popIn {
                to { transform: scale(1); }
            }
            
            .epic-pulse {
                position: relative;
                z-index: 10;
                text-align: center;
                margin: 20px 0;
                animation: epicPulse 2s infinite;
            }
            
            @keyframes epicPulse {
                0%, 100% { transform: scale(1); filter: brightness(1); }
                50% { transform: scale(1.02); filter: brightness(1.2); }
            }
            
            .challenge-subtitle {
                font-size: 1.2rem;
                letter-spacing: 0.5rem;
                color: rgba(255,255,255,0.6);
                font-family: 'Orbitron', sans-serif;
                font-weight: 700;
            }
            
            .challenge-title {
                font-size: clamp(3rem, 10vw, 8rem);
                font-family: 'Orbitron', sans-serif;
                font-weight: 900;
                line-height: 1;
                margin: 10px 0;
            }
            
            .gold-gradient {
                background: linear-gradient(180deg, #fff 0%, #ffcc00 50%, #b8860b 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                filter: drop-shadow(0 0 20px rgba(255,204,0,0.5));
            }
            
            .reward-stats {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: clamp(20px, 5vw, 60px);
                margin: 40px 0;
                position: relative;
                z-index: 10;
                flex-wrap: wrap;
            }
            
            .stat-card {
                text-align: center;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(10px);
                padding: 20px 30px;
                border-radius: 20px;
                border: 1px solid rgba(255,255,255,0.2);
                min-width: 150px;
            }
            
            .stat-label {
                font-size: 10px;
                letter-spacing: 2px;
                color: #48bb78;
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .stat-value {
                font-size: 2.5rem;
                font-weight: 900;
                font-family: 'Orbitron', sans-serif;
            }
            
            .medal-container {
                position: relative;
                width: 100px;
                height: 100px;
            }
            
            .medal-glow {
                position: absolute;
                inset: -10px;
                background: radial-gradient(circle, rgba(255,204,0,0.5) 0%, rgba(255,204,0,0) 70%);
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }
            
            .medal-icon {
                width: 100%;
                height: 100%;
                object-fit: contain;
                position: relative;
                z-index: 10;
                animation: bounce 0.8s ease infinite 3;
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .proceed-btn, .skip-celebration-btn {
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.3);
                padding: 14px 32px;
                border-radius: 50px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                margin: 10px;
                font-family: 'Orbitron', sans-serif;
                letter-spacing: 2px;
                font-size: 12px;
            }
            
            .proceed-btn:hover, .skip-celebration-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: scale(1.05);
            }
            
            .skip-celebration-btn {
                background: rgba(0,0,0,0.6);
                border-color: rgba(255,255,255,0.2);
            }
            
            .shake {
                animation: shakeAnim 0.2s infinite;
            }
            
            @keyframes shakeAnim {
                0% { transform: translate(1px, 1px); }
                50% { transform: translate(-2px, -1px); }
                100% { transform: translate(1px, 1px); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* Mobile Responsive */
            @media (max-width: 768px) {
                .checklist-items {
                    gap: 8px;
                }
                .quest-card {
                    padding: 8px 12px;
                    min-width: 90px;
                }
                .quest-name {
                    font-size: 9px;
                }
                .stat-card {
                    padding: 12px 20px;
                    min-width: 100px;
                }
                .stat-value {
                    font-size: 1.5rem;
                }
                .medal-container {
                    width: 70px;
                    height: 70px;
                }
                .proceed-btn, .skip-celebration-btn {
                    padding: 10px 24px;
                    font-size: 10px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
};

window.ChallengeCelebration = ChallengeCelebration;