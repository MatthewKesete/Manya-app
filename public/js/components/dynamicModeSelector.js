// public/js/components/dynamicModeSelector.js
const DynamicModeSelector = {
    // Tracking metrics
    metrics: {
        confidence: 0.7,      // 0-1 (accuracy last 5)
        frustration: 0.3,     // 0-1 (hints + time + changes)
        mastery: 0.5,         // 0-1 (overall correct)
        sessionEnergy: 0.5    // 0-1 (questions answered / 15)
    },
    
    // Current mode mix for next questions
    currentMix: {
        normal: 0.6,
        speedTimer: 0.2,
        reverse: 0.1,
        recap: 0.1
    },
    
    // Speed timer state
    speedTimerActive: false,
    speedTimerInterval: null,
    timeLeft: 0,
    timerCallbacks: {},
    
    // Reverse mode state
    reverseModeActive: false,
    currentReverseQuestion: null,
    
    // Love reaction tracking
    consecutiveCorrect: 0,
    loveReactionActive: false,
    
    // Earthquake tracking for 100% mastery
    masteryProgress: 0,
    lastQuestionBeforeComplete: false,
    
    init() {
        this.injectStyles();
        console.log('🎮 Dynamic Mode Selector initialized');
    },
    
    // Update metrics based on recent performance
    updateMetrics(answers, sessionStats) {
        // Calculate confidence from last 5 answers
        const last5 = answers.slice(-5);
        const correctLast5 = last5.filter(a => a.isCorrect).length;
        this.metrics.confidence = correctLast5 / 5;
        
        // Calculate frustration (hint usage + time + changes)
        const hintRate = answers.filter(a => a.hintUsed).length / Math.max(answers.length, 1);
        const avgTime = answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / Math.max(answers.length, 1);
        const changeRate = answers.reduce((sum, a) => sum + (a.changeCount || 0), 0) / Math.max(answers.length, 1);
        this.metrics.frustration = Math.min(1, (hintRate * 0.4) + (avgTime > 30000 ? 0.3 : 0) + (changeRate * 0.3));
        
        // Calculate mastery
        const totalCorrect = answers.filter(a => a.isCorrect).length;
        this.metrics.mastery = totalCorrect / Math.max(answers.length, 1);
        
        // Calculate session energy (questions answered this session)
        this.metrics.sessionEnergy = Math.min(1, answers.length / 15);
        
        // Update mode mix based on metrics
        this.calculateModeMix();
        
        console.log('📊 Metrics updated:', this.metrics);
        console.log('🎮 Mode mix:', this.currentMix);
        
        return this.currentMix;
    },
    
    calculateModeMix() {
        const { confidence, frustration, mastery, sessionEnergy } = this.metrics;
        
        // High confidence + Low frustration -> More speed and reverse
        if (confidence > 0.7 && frustration < 0.3) {
            this.currentMix = {
                normal: 0.4,
                speedTimer: 0.3,
                reverse: 0.2,
                recap: 0.1
            };
        } 
        // Medium confidence
        else if (confidence > 0.5 && confidence <= 0.7) {
            this.currentMix = {
                normal: 0.6,
                speedTimer: 0.2,
                reverse: 0.1,
                recap: 0.1
            };
        }
        // Low confidence / High frustration -> More recaps, no speed timer
        else if (confidence <= 0.5 || frustration > 0.6) {
            this.currentMix = {
                normal: 0.7,
                speedTimer: 0,
                reverse: 0,
                recap: 0.3
            };
        }
        
        // After 8+ questions (tired) -> Adjust
        if (sessionEnergy > 0.6) {
            this.currentMix.normal = Math.max(0.5, this.currentMix.normal - 0.1);
            this.currentMix.recap = Math.min(0.3, this.currentMix.recap + 0.1);
        }
        
        // Mastery high -> More reverse mode
        if (mastery > 0.75) {
            this.currentMix.reverse = Math.min(0.3, this.currentMix.reverse + 0.1);
            this.currentMix.normal = Math.max(0.3, this.currentMix.normal - 0.1);
        }
    },
    
    // Get next mode based on current mix
    getNextMode() {
        const random = Math.random();
        let cumulative = 0;
        
        for (const [mode, probability] of Object.entries(this.currentMix)) {
            cumulative += probability;
            if (random < cumulative) return mode;
        }
        return 'normal';
    },
    
    // ========== SPEED TIMER MODE ==========
    async startSpeedTimer(question, onTimeout, onSuccess, timeLimit = 35) {
        this.speedTimerActive = true;
        this.timeLeft = timeLimit;
        
        // Show timer UI
        this.showTimerUI(timeLimit);
        
        // Play drum roll sound
        if (window.MANYAAudioSystem) {
            try {
                const drumRoll = new Audio('/multimedia_assets/audios/drum-roll.mp3');
                drumRoll.volume = 0.6;
                await drumRoll.play();
            } catch (err) {}
        }
        
        // Start countdown
        this.speedTimerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            // Last 10 seconds - orange color + faster tick
            if (this.timeLeft <= 10) {
                this.updateTimerCritical();
            }
            
            // Time's up!
            if (this.timeLeft <= 0) {
                this.stopSpeedTimer();
                onTimeout();
            }
        }, 1000);
        
        // Store callbacks
        this.timerCallbacks = { onTimeout, onSuccess };
        
        return this.timeLeft;
    },
    
    showTimerUI(timeLimit) {
        let timerDiv = document.getElementById('speed-timer');
        if (!timerDiv) {
            timerDiv = document.createElement('div');
            timerDiv.id = 'speed-timer';
            timerDiv.className = 'speed-timer';
            document.querySelector('.gameplay-header').appendChild(timerDiv);
        }
        
        timerDiv.innerHTML = `
            <div class="timer-label">⚡ SPEED CHALLENGE ⚡</div>
            <div class="timer-bar-container">
                <div class="timer-bar" style="width: 100%"></div>
            </div>
            <div class="timer-time">${this.timeLeft}s</div>
        `;
        timerDiv.style.display = 'block';
    },
    
    updateTimerDisplay() {
        const timerDiv = document.getElementById('speed-timer');
        if (!timerDiv) return;
        
        const percentage = (this.timeLeft / 35) * 100;
        const bar = timerDiv.querySelector('.timer-bar');
        const timeSpan = timerDiv.querySelector('.timer-time');
        
        if (bar) bar.style.width = `${percentage}%`;
        if (timeSpan) timeSpan.textContent = `${this.timeLeft}s`;
    },
    
    updateTimerCritical() {
        const timerDiv = document.getElementById('speed-timer');
        if (!timerDiv) return;
        
        timerDiv.classList.add('timer-critical');
        const bar = timerDiv.querySelector('.timer-bar');
        if (bar) bar.style.backgroundColor = '#f97316';
        
        // Play ticking sound
        if (window.MANYAAudioSystem && this.timeLeft <= 5) {
            try {
                const tick = new Audio('/multimedia_assets/audios/tick.mp3');
                tick.volume = 0.3;
                tick.play().catch(() => {});
            } catch (err) {}
        }
    },
    
    stopSpeedTimer() {
        if (this.speedTimerInterval) {
            clearInterval(this.speedTimerInterval);
            this.speedTimerInterval = null;
        }
        this.speedTimerActive = false;
        
        const timerDiv = document.getElementById('speed-timer');
        if (timerDiv) timerDiv.style.display = 'none';
    },
    
    celebrateSpeedWin() {
        // Big celebration
        if (window.ConfettiService) {
            window.ConfettiService.celebrate();
        }
        
        // Show champion message
        const championMsg = document.createElement('div');
        championMsg.className = 'champion-celebration';
        championMsg.innerHTML = `
            <div class="champion-content">
                <span class="champion-icon">🏆</span>
                <span class="champion-text">CHAMPION! You beat the clock!</span>
                <span class="champion-icon">⚡</span>
            </div>
        `;
        document.body.appendChild(championMsg);
        
        setTimeout(() => championMsg.remove(), 3000);
        
        // Play fanfare
        if (window.MANYAAudioSystem) {
            try {
                const fanfare = new Audio('/multimedia_assets/audios/fanfare-trumpets.mp3');
                fanfare.volume = 0.7;
                fanfare.play().catch(() => {});
            } catch (err) {}
        }
    },
    
    // ========== REVERSE MODE ==========
    createReverseQuestion(normalQuestion, allQuestions) {
        // Take a normal MCQ and reverse it
        // Show the correct answer text, ask which question matches
        
        const correctAnswerText = this.getAnswerText(normalQuestion);
        const correctQuestionText = normalQuestion.text;
        
        // Find 3 other questions from database for distractors
        const otherQuestions = allQuestions
            .filter(q => q.id !== normalQuestion.id)
            .slice(0, 3);
        
        const options = [
            { text: correctQuestionText, isCorrect: true },
            ...otherQuestions.map(q => ({ text: q.text, isCorrect: false }))
        ];
        
        // Shuffle options
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        
        return {
            type: 'reverse',
            answerShown: correctAnswerText,
            options: options,
            originalQuestionId: normalQuestion.id,
            correctOption: options.find(o => o.isCorrect).text
        };
    },
    
    getAnswerText(question) {
        // Extract the correct answer text from the question
        const correctLetter = this.extractCorrectLetter(question.correctAnswer);
        return question.options[correctLetter] || '';
    },
    
    extractCorrectLetter(correctAnswer) {
        if (!correctAnswer) return 'A';
        if (correctAnswer.startsWith('Option_')) return correctAnswer.replace('Option_', '');
        if (['A','B','C','D'].includes(correctAnswer)) return correctAnswer;
        return 'A';
    },
    
    // ========== LOVE REACTION (4 consecutive correct) ==========
    checkLoveReaction(consecutiveCorrect) {
        if (consecutiveCorrect >= 4 && !this.loveReactionActive) {
            this.triggerLoveReaction();
            this.consecutiveCorrect = 0;
            return true;
        }
        return false;
    },
    
// In dynamicModeSelector.js, update triggerLoveReaction:
triggerLoveReaction() {
    if (this.loveReactionActive) return;
    this.loveReactionActive = true;
    
    console.log('💕 LOVE REACTION! Creating floating hearts...');
    
    // Create floating hearts across the screen
    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.className = 'love-heart';
            heart.innerHTML = ['❤️', '💖', '💗', '💓', '💕', '💝', '💘'][Math.floor(Math.random() * 7)];
            heart.style.cssText = `
                position: fixed;
                left: ${Math.random() * window.innerWidth}px;
                bottom: -50px;
                font-size: ${20 + Math.random() * 40}px;
                pointer-events: none;
                z-index: 20000;
                animation: loveFloat ${1 + Math.random() * 1.5}s ease-out forwards;
            `;
            document.body.appendChild(heart);
            
            setTimeout(() => {
                if (heart.parentNode) heart.remove();
            }, 2000);
        }, i * 60);
    }
    
    // Play love sound
    if (window.MANYAAudioSystem) {
        try {
            const loveSound = new Audio('/multimedia_assets/audios/magic-positive.mp3');
            loveSound.volume = 0.5;
            loveSound.play().catch(() => {});
        } catch (err) {}
    }
    
    // Show "LOVE STREAK!" message
    const loveMsg = document.createElement('div');
    loveMsg.className = 'love-streak-message';
    loveMsg.innerHTML = `
        <div class="love-streak-content">
            <span>💕 4 IN A ROW! 💕</span>
            <span>LOVE STREAK!</span>
        </div>
    `;
    document.body.appendChild(loveMsg);
    
    setTimeout(() => {
        if (loveMsg.parentNode) loveMsg.remove();
    }, 2500);
    
    setTimeout(() => {
        this.loveReactionActive = false;
    }, 3000);
},
    
    // ========== EARTHQUAKE SHAKE (near 100% mastery) ==========
    checkEarthquake(masteryPercentage, remainingQuestions) {
        // If mastery is 80%+ and only 2 questions left
        if (masteryPercentage >= 80 && remainingQuestions <= 2 && !this.lastQuestionBeforeComplete) {
            this.triggerEarthquake();
            this.lastQuestionBeforeComplete = true;
            return true;
        }
        return false;
    },
    
    triggerEarthquake() {
        // Add earthquake class to body
        document.body.classList.add('earthquake');
        
        // Play earthquake sound
        if (window.MANYAAudioSystem) {
            try {
                const rumble = new Audio('/multimedia_assets/audios/rumble.mp3');
                rumble.volume = 0.5;
                rumble.play().catch(() => {});
            } catch (err) {}
        }
        
        // Show warning message
        const quakeMsg = document.createElement('div');
        quakeMsg.className = 'earthquake-warning';
        quakeMsg.innerHTML = `
            <div class="quake-content">
                <span>⚠️ EARTHQUAKE ZONE! ⚠️</span>
                <span>Almost there!</span>
            </div>
        `;
        document.body.appendChild(quakeMsg);
        
        setTimeout(() => {
            document.body.classList.remove('earthquake');
            quakeMsg.remove();
        }, 2000);
    },
    
    // ========== STYLES ==========
    injectStyles() {
        if (document.getElementById('dynamic-mode-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dynamic-mode-styles';
        style.textContent = `
            /* Speed Timer Styles */
            .speed-timer {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 12px;
                padding: 8px 16px;
                text-align: center;
                color: white;
                min-width: 180px;
                animation: timerPulse 1s infinite;
            }
            
            .timer-label {
                font-size: 10px;
                letter-spacing: 2px;
                color: #fbbf24;
                margin-bottom: 5px;
            }
            
            .timer-bar-container {
                background: #2d3748;
                border-radius: 10px;
                height: 6px;
                overflow: hidden;
                margin: 5px 0;
            }
            
            .timer-bar {
                background: #48bb78;
                height: 100%;
                width: 100%;
                transition: width 0.1s linear;
            }
            
            .timer-time {
                font-size: 20px;
                font-weight: bold;
                font-family: monospace;
            }
            
            .speed-timer.timer-critical .timer-bar {
                background: #f97316;
                animation: timerBlink 0.5s infinite;
            }
            
            @keyframes timerPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            
            @keyframes timerBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            
            /* Champion Celebration */
            .champion-celebration {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, gold, #ffd966);
                padding: 20px 40px;
                border-radius: 60px;
                z-index: 20000;
                animation: championPop 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
                box-shadow: 0 0 50px rgba(255,215,0,0.5);
            }
            
            .champion-content {
                display: flex;
                align-items: center;
                gap: 20px;
                font-size: 24px;
                font-weight: bold;
                color: #5a67d8;
            }
            
            .champion-icon {
                font-size: 40px;
                animation: bounce 0.5s ease;
            }
            
            @keyframes championPop {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.1);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            /* Love Reaction */
            .love-heart {
                position: fixed;
                pointer-events: none;
                z-index: 20001;
                animation: loveFloat 1.5s ease-out forwards;
            }
            
            @keyframes loveFloat {
                0% {
                    opacity: 1;
                    transform: translateY(0) scale(0.5);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-200px) scale(1.5);
                }
            }
            
            .love-streak-message {
                position: fixed;
                top: 30%;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #ff6b6b, #ff4d4d);
                padding: 15px 30px;
                border-radius: 60px;
                z-index: 20002;
                animation: loveStreakPop 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
                color: white;
                font-weight: bold;
                font-size: 18px;
                text-align: center;
                box-shadow: 0 0 30px rgba(255,107,107,0.5);
            }
            
            @keyframes loveStreakPop {
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
            
            /* Earthquake Effect */
            .earthquake {
                animation: earthquake 0.15s infinite;
            }
            
            @keyframes earthquake {
                0% { transform: translate(1px, 1px); }
                25% { transform: translate(-1px, -2px); }
                50% { transform: translate(-2px, 1px); }
                75% { transform: translate(1px, -1px); }
                100% { transform: translate(1px, 1px); }
            }
            
            .earthquake-warning {
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                padding: 15px 30px;
                border-radius: 60px;
                z-index: 20003;
                animation: quakeWarning 0.3s ease;
                color: #f97316;
                font-weight: bold;
                text-align: center;
                border: 2px solid #f97316;
            }
            
            @keyframes quakeWarning {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.5);
                }
                100% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1);
                }
            }
            
            /* Reverse Mode Question Card */
            .reverse-question-card {
                background: linear-gradient(135deg, #667eea20, #764ba220);
                border: 2px solid #9f7aea;
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
                text-align: center;
            }
            
            .answer-shown {
                font-size: 1.2em;
                font-weight: bold;
                color: #9f7aea;
                margin-bottom: 15px;
                padding: 10px;
                background: rgba(159, 122, 234, 0.1);
                border-radius: 12px;
            }
            
            .kiki-message {
                display: flex;
                align-items: center;
                gap: 10px;
                justify-content: center;
                margin-bottom: 15px;
                color: #fbbf24;
            }
        `;
        
        document.head.appendChild(style);
    }
};

window.DynamicModeSelector = DynamicModeSelector;