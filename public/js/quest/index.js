// quest/index.js - Main QuestScreen Object
const QuestScreen = {
    // Data properties
    questData: null,
    challenge: null,
    currentQuestionIndex: 0,
    questions: [],
    answers: [],
    hintUsed: false,
    hintDisplayed: false,
    onComplete: null,
    
    // Study mode tracking
    studySims: [],
    currentStudySimIndex: -1,
    isStudyMode: false,
    
    // Selection tracking
    selectedOption: null,
    answerSubmitted: false,
    
    // DOM elements
    hintBtn: null,
    submitBtn: null,
    hintDisplay: null,
    
    // Tracking parameters
    startTime: null,
    questionStartTime: null,
    hesitationCount: 0,
    hesitationTimer: null,
    answerChanged: false,
    changeCount: 0,
    
    // Current labeling question reference
    currentLabelingQuestion: null,
    currentSubject: 'science',
    
    // Psychological parameters
    params: {
        accuracy: 0,
        mastery: 0,
        confidence: 70,
        frustration: 0,
        hintUsage: 0,
        hesitationRate: 0
    },
    
    // ========== Core Methods ==========
   init(questData, challenge, onComplete) {
    window.QuestCore.init(questData, challenge, onComplete, this);
    
    // Create compact gem display
    this.createCompactGemDisplay();
     // Initialize Dynamic Mode Selector
    if (window.DynamicModeSelector) {
        window.DynamicModeSelector.init();
    }

    // Initialize progress bar in compact container
    if (window.ProgressBarSystem) {
        // Set custom container for progress bar
        ProgressBarSystem.containerId = 'progress-bar-compact';
        setTimeout(() => {
            window.ProgressBarSystem.init();
        }, 100);
    }
    
    // Initialize coin animation
    if (window.CoinAnimation) {
        setTimeout(() => {
            window.CoinAnimation.init();
        }, 100);
    }
    
    // Initialize like button system
    if (window.LikeButtonSystem && !window.LikeButtonSystem.initialized) {
        setTimeout(() => {
            window.LikeButtonSystem.init();
            window.LikeButtonSystem.initialized = true;
        }, 100);
    }
},
    
    loadNextContent() {
        window.QuestCore.loadNextContent(this);
    },
    
    loadQuestion(index) {
        window.QuestCore.loadQuestion(index, this);
    },
    
    // ========== Answer Methods ==========
    selectOption(letter) {
        window.QuestAnswer.selectOption(letter, this);
    },
    
    renderOptions(question) {
        window.QuestAnswer.renderOptions(question, (letter) => this.selectOption(letter));
    },
    
    async getHint() {
        const question = this.questions[this.currentQuestionIndex];
        await window.QuestAnswer.getHint(question.id, this.hintDisplay, (used) => { this.hintUsed = used; }, this.hintBtn);
    },
    
async submitAnswer() {
    console.log('🔵 submitAnswer called');
    
    if (!this.selectedOption || this.answerSubmitted) {
        console.log('   Blocked - no selection or already submitted');
        return;
    }
    
    if (this.hesitationTimer) clearInterval(this.hesitationTimer);
    
    this.answerSubmitted = true;
    if (this.submitBtn) this.submitBtn.disabled = true;
    if (this.hintBtn) this.hintBtn.disabled = true;
    
    document.querySelectorAll('.option').forEach(opt => {
        opt.style.pointerEvents = 'none';
    });
    
    const responseTime = Date.now() - this.questionStartTime;
    const question = this.currentQuestion || this.questions[this.currentQuestionIndex];
    const correctAnswer = window.QuestUtils.extractCorrectLetter(question.correctAnswer);
    const isCorrect = this.selectedOption === correctAnswer;
    
    console.log(`   Answer: ${this.selectedOption}, Correct: ${correctAnswer}, Result: ${isCorrect ? '✅' : '❌'}`);
    
    // Track consecutive correct answers FIRST
    if (isCorrect) {
        this.consecutiveCorrect = (this.consecutiveCorrect || 0) + 1;
        console.log(`   Consecutive correct: ${this.consecutiveCorrect}`);
    } else {
        this.consecutiveCorrect = 0;
        if (window.LikeButtonSystem) {
            window.LikeButtonSystem.reset();
        }
    }
    
    // Track rewards
    let coinResult = null;
    try {
        await window.QuestRewards.trackEmotion(window.App?.currentUser || 'student-001', 
            isCorrect ? 'confident' : 'frustrated', isCorrect ? 80 : 60, 'answer_submitted', responseTime);
        const rewardData = await window.QuestRewards.trackReward(window.App?.currentUser || 'student-001', 
            isCorrect, this.hintUsed, this.currentSubject, (awarded) => window.QuestUI.showRewardAnimation(awarded));
        
        if (rewardData && rewardData.chestAwarded) {
             window.QuestUI.showChestDrop(rewardData.chestAwarded);
        }
        if (rewardData && rewardData.achievementsUnlocked && rewardData.achievementsUnlocked.length > 0) {
             rewardData.achievementsUnlocked.forEach(ach => window.QuestUI.showAchievementPopup(ach));
        }
        await window.QuestRewards.updateStreak(window.App?.currentUser || 'student-001', isCorrect, window.MANYACharacterSystem);
        coinResult = await window.QuestRewards.updateCoins(window.App?.currentUser || 'student-001', 
            isCorrect, this.hintUsed, (balance) => window.QuestRewards.updateCoinDisplay(balance));
        
        // Enhanced coin animation with flying coins
        if (coinResult && coinResult.coinChange !== undefined) {
            const sourceEl = document.querySelector('.option.selected') || this.submitBtn;
            
            if (coinResult.coinChange > 0) {
                if (window.CoinAnimation) {
                    await window.CoinAnimation.addCoins(coinResult.coinChange, sourceEl);
                }
                window.QuestUI.showCoinAnimation(coinResult.coinChange);
            } else if (coinResult.coinChange < 0) {
                if (window.CoinAnimation) {
                    await window.CoinAnimation.deductCoins(Math.abs(coinResult.coinChange));
                }
                window.QuestUI.showCoinAnimation(coinResult.coinChange);
            }
        }
    } catch (err) {
        console.error('Error tracking rewards:', err);
    }
    
    // Update UI highlighting
    document.querySelectorAll('.option').forEach(opt => {
        if (opt.dataset.letter === correctAnswer) {
            opt.classList.add('correct');
        } else if (opt.dataset.letter === this.selectedOption && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });
    
    // Store the answer
    this.answers.push({
        questionId: question.id,
        selectedAnswer: this.selectedOption,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        timeSpent: responseTime,
        hintUsed: this.hintUsed,
        answerChanged: this.answerChanged,
        changeCount: this.changeCount,
        hesitationCount: this.hesitationCount
    });
    
    console.log(`   Answer stored, total answers: ${this.answers.length}`);
    
    // Update points display
    const pointsSpan = document.querySelector('.points-earned');
    if (pointsSpan) {
        const pointsEarned = isCorrect ? (this.hintUsed ? 2 : 3) : 0;
        const currentPoints = parseInt(pointsSpan.textContent.split(' ')[1]) || 0;
        pointsSpan.textContent = `⭐ ${currentPoints + pointsEarned}`;
    }
    
    // Update accuracy
    const correctSoFar = this.answers.filter(a => a.isCorrect).length;
    this.params.accuracy = (correctSoFar / this.answers.length) * 100;
    QuestRewards.updateParameterDisplays(this.params, this.answers);
    
    // Update progress bar
    const totalCount = this.answers.length;
    const streak = await this.getCurrentStreak();
    if (window.ProgressBarSystem) {
        window.ProgressBarSystem.updateProgress(correctSoFar, totalCount, streak);
    }
    
    // If speed mode was active, stop it when the user submits
    if (window.DynamicModeSelector && window.DynamicModeSelector.speedTimerActive) {
        if (isCorrect && window.DynamicModeSelector.timerCallbacks?.onSuccess) {
            window.DynamicModeSelector.timerCallbacks.onSuccess();
        }
        window.DynamicModeSelector.stopSpeedTimer();
    }
    
    // Check for love reaction (4 consecutive correct) - BEFORE playing sounds
    if (isCorrect && this.consecutiveCorrect >= 4) {
        console.log('💕 LOVE REACTION TRIGGERED!');
        if (window.DynamicModeSelector) {
            window.DynamicModeSelector.triggerLoveReaction();
        }
        this.consecutiveCorrect = 0; // Reset after triggering
    }
    
    // Check for earthquake (near 100% mastery)
    const masteryPercentage = (correctSoFar / this.answers.length) * 100;
    const remainingQuestions = this.questions.length - this.currentQuestionIndex - 1;
    if (window.DynamicModeSelector) {
        window.DynamicModeSelector.checkEarthquake(masteryPercentage, remainingQuestions);
    }
    
    // Handle based on correct/wrong
    if (isCorrect) {
        console.log('   CORRECT - Playing effects');
        
        window.QuestUI.showDoubleScreenFlash('correct');
        
        // Play sound ONLY ONCE
        let word = null;
        if (window.MANYAAudioSystem) {
            word = await window.MANYAAudioSystem.playCorrect();
        }
        
        if (word) {
            window.QuestUI.showWordFlash(word);
        } else {
            window.QuestUI.showWordFlash('Great');
        }
        
        // Character reaction - NO SOUND
        if (window.MANYACharacterSystem) {
            window.MANYACharacterSystem.speak(window.MANYACharacterSystem.getCharacter().messages.correct, 2000);
        }
        
        // Like button tracking (after sound)
        if (window.LikeButtonSystem) {
            window.LikeButtonSystem.recordCorrect();
        }
        
        setTimeout(() => {
            this.currentQuestionIndex++;
            console.log(`   Advancing to question ${this.currentQuestionIndex + 1}`);
            this.loadNextContent();
        }, 1500);
        
    } else {
        console.log('   WRONG - Growth Mindset Feedback');
        
        // Play single error sound
        if (window.MANYAAudioSystem && window.MANYAAudioSystem.playWrong) {
            window.MANYAAudioSystem.playWrong();
        }
        
        // Gentle gold glow
        this.showDoubleScreenFlash('wrong');
        
        // Gently highlight the correct answer
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.dataset.letter === correctAnswer) {
                opt.classList.add('gentle-highlight');
            }
        });
        
        // Growth mindset message
        this.showGrowthMindsetMessage();
        
        // Character encouragement
        if (window.MANYACharacterSystem) {
            const growthMessages = [
                "Mistakes help us grow! Let's see the correct answer. 🌱",
                "That's how we learn! Check this out. 📚",
                "Every step counts! Here's what we need to know. 💪",
                "Great effort! Let's remember this one. 🧠"
            ];
            const randomMsg = growthMessages[Math.floor(Math.random() * growthMessages.length)];
            window.MANYACharacterSystem.speak(randomMsg, 2500);
        }
        
        // Fetch detailed solution for modal
        let detailedSolution = '';
        try {
            const solutionResponse = await fetch(`/api/solution/${question.id}`);
            if (solutionResponse.ok) {
                const solutionData = await solutionResponse.json();
                detailedSolution = solutionData.detailedSolution || '';
            }
        } catch (err) {
            console.error('Error fetching solution:', err);
        }
        
        if (!detailedSolution) {
            detailedSolution = `The correct answer is ${correctAnswer}. ${this.getOptionText(question, correctAnswer)}. Let's remember this for next time! 📚`;
        }
        
        // Use the QuestUI.showLearningModal method
        const self = this;
        window.QuestUI.showLearningModal(
            question,
            this.selectedOption,
            correctAnswer,
            this.getOptionText.bind(this),
            function() {
                document.querySelectorAll('.option.gentle-highlight').forEach(opt => {
                    opt.classList.remove('gentle-highlight');
                });
                self.currentQuestionIndex++;
                self.loadNextContent();
            },
            detailedSolution
        );
        
        if (window.LikeButtonSystem) {
            window.LikeButtonSystem.reset();
        }
    }
},
  // Get next mode based on metrics
async getNextQuestionMode() {
    if (!window.DynamicModeSelector) return 'normal';
    
    // Update metrics with current data
    window.DynamicModeSelector.updateMetrics(this.answers, {
        questionsAnswered: this.answers.length,
        sessionStartTime: this.startTime
    });
    
    return window.DynamicModeSelector.getNextMode();
},

// Load question with dynamic mode
async loadQuestionWithMode(index) {
    const mode = await this.getNextQuestionMode();
    console.log(`🎮 Loading question ${index + 1} with mode: ${mode}`);
    
    if (mode === 'speedTimer' && (this.currentQuestionIndex >= 2 || (window.DynamicModeSelector && window.DynamicModeSelector.forcedMode === 'speedTimer'))) {
        this.loadSpeedTimerQuestion(this.questions[index]);
    } else if (mode === 'reverse') {
        this.loadReverseQuestion(this.questions[index]);
    } else {
        this.loadNormalQuestion(index);
    }
},

loadNormalQuestion(index) {
    window.QuestCore.loadQuestion(index, this);
},

loadSpeedTimerQuestion(question) {
    // Load the question normally, then start the dramatic countdown overlay
    this.loadNormalQuestion(this.currentQuestionIndex);
    if (window.DynamicModeSelector) {
        window.DynamicModeSelector.startSpeedTimer(
            question,
            () => this.handleSpeedTimerTimeout(),
            () => window.DynamicModeSelector.celebrateSpeedWin(),
            18
        ).catch(() => {});
    }
},

async handleSpeedTimerTimeout() {
    if (!window.DynamicModeSelector || !window.DynamicModeSelector.speedTimerActive) return;

    console.log('⏰ Speed timer expired - treating as timeout failure');
    window.DynamicModeSelector.stopSpeedTimer();

    // Prevent further input
    document.querySelectorAll('.option').forEach(opt => opt.style.pointerEvents = 'none');
    if (this.submitBtn) this.submitBtn.disabled = true;
    if (this.hintBtn) this.hintBtn.disabled = true;

    const question = this.currentQuestion || this.questions[this.currentQuestionIndex];
    const correctAnswer = window.QuestUtils.extractCorrectLetter(question.correctAnswer);

    this.consecutiveCorrect = 0;
    if (window.LikeButtonSystem) {
        window.LikeButtonSystem.reset();
    }

    this.answers.push({
        questionId: question.id,
        selectedAnswer: null,
        correctAnswer: correctAnswer,
        isCorrect: false,
        timeSpent: (window.DynamicModeSelector && window.DynamicModeSelector.timeLeft >= 0) ? ((18 - window.DynamicModeSelector.timeLeft) * 1000) : 18000,
        hintUsed: this.hintUsed,
        answerChanged: this.answerChanged,
        changeCount: this.changeCount,
        hesitationCount: this.hesitationCount
    });

    const correctSoFar = this.answers.filter(a => a.isCorrect).length;
    this.params.accuracy = (correctSoFar / this.answers.length) * 100;
    QuestRewards.updateParameterDisplays(this.params, this.answers);

    const streak = await this.getCurrentStreak();
    if (window.ProgressBarSystem) {
        window.ProgressBarSystem.updateProgress(correctSoFar, this.answers.length, streak);
    }

    if (window.MANYAAudioSystem && window.MANYAAudioSystem.playWrong) {
        window.MANYAAudioSystem.playWrong();
    }
    this.showDoubleScreenFlash('wrong');
    
    document.querySelectorAll('.option').forEach(opt => {
        if (opt.dataset.letter === correctAnswer) {
            opt.classList.add('gentle-highlight');
        }
    });
    
    this.showGrowthMindsetMessage();
    window.QuestUI.showWordFlash('Time');
    
    if (window.MANYACharacterSystem) {
        window.MANYACharacterSystem.speak("Out of time! ⏰ Let's check the right answer.", 2500);
    }

    let detailedSolution = '';
    try {
        const solutionResponse = await fetch(`/api/solution/${question.id}`);
        if (solutionResponse.ok) {
            const solutionData = await solutionResponse.json();
            detailedSolution = solutionData.detailedSolution || '';
        }
    } catch (err) {}
    
    if (!detailedSolution) {
        detailedSolution = `The correct answer is ${correctAnswer}. ${this.getOptionText(question, correctAnswer)}. You gotta be faster next time! ⚡`;
    }

    const self = this;
    window.QuestUI.showLearningModal(
        question,
        'Time Out',
        correctAnswer,
        this.getOptionText.bind(this),
        function() {
            document.querySelectorAll('.option.gentle-highlight').forEach(opt => {
                opt.classList.remove('gentle-highlight');
            });
            self.currentQuestionIndex++;
            self.loadNextContent();
        },
        detailedSolution
    );
},

loadReverseQuestion(question) {
    if (!window.DynamicModeSelector) {
        return this.loadNormalQuestion(this.currentQuestionIndex);
    }

    const reverseData = window.DynamicModeSelector.createReverseQuestion(question, this.questions);
    if (!reverseData) {
        return this.loadNormalQuestion(this.currentQuestionIndex);
    }

    const reverseQuestion = {
        ...question,
        text: `🔁 REVERSE MODE: Which question best matches this answer?\n\n${reverseData.answerShown}`,
        options: {},
        correctAnswer: ''
    };

    const letters = ['A', 'B', 'C', 'D'];
    reverseData.options.forEach((option, idx) => {
        const letter = letters[idx];
        reverseQuestion.options[letter] = option.text;
        if (option.isCorrect) {
            reverseQuestion.correctAnswer = letter;
        }
    });

    window.QuestCore.loadQuestion(this.currentQuestionIndex, this, reverseQuestion);
},  
    // Helper to get current streak
    async getCurrentStreak() {
        const userId = window.App?.currentUser || 'student-001';
        try {
            const response = await fetch(`/api/gamification/streak/${userId}`);
            const data = await response.json();
            return data.current_streak || 0;
        } catch (err) {
            return 0;
        }
    },
    
    // ========== Study Methods ==========
    showStudySim(studySim) {
        window.QuestStudy.showStudySim(studySim, this);
    },
    
    addStudyMessage() {
        window.QuestStudy.addStudyMessage();
    },
    
    setupStudyContinueButton(studySim) {
        window.QuestStudy.setupStudyContinueButton(studySim, this);
    },
    
    loadSimulationQuestion(question) {
        window.QuestStudy.loadSimulationQuestion(question, this);
    },
    
    setupLabelingSim(question) {
        window.QuestStudy.setupLabelingSim(question, this);
    },
    
    // ========== Utility Methods ==========
    extractCorrectLetter(correctAnswer) {
        return QuestUtils.extractCorrectLetter(correctAnswer);
    },
    
    detectSubject(questData, challenge) {
        return window.QuestUtils.detectSubject(questData, challenge);
    },
    
    getOptionText(question, letter) {
        return window.QuestUtils.getOptionText(question, letter);
    },
    
    loadScript(src) {
        return window.QuestUtils.loadScript(src);
    },
    
    // ========== Reward Methods ==========
    async trackEmotion(emotion, intensity, context, responseTime) {
        return window.QuestRewards.trackEmotion(window.App?.currentUser || 'student-001', emotion, intensity, context, responseTime);
    },
    
    async trackReward(isCorrect, hintUsed, subject) {
        return window.QuestRewards.trackReward(window.App?.currentUser || 'student-001', isCorrect, hintUsed, subject, (awarded) => window.QuestUI.showRewardAnimation(awarded));
    },
    
    async updateStreak(isCorrect) {
        return window.QuestRewards.updateStreak(window.App?.currentUser || 'student-001', isCorrect, window.MANYACharacterSystem);
    },
    
    async updateCoins(isCorrect, hintUsed) {
        return window.QuestRewards.updateCoins(window.App?.currentUser || 'student-001', isCorrect, hintUsed, (balance) => window.QuestRewards.updateCoinDisplay(balance));
    },
    
    updateCoinDisplay(balance) {
        window.QuestRewards.updateCoinDisplay(balance);
    },
    
    updateParameterDisplays() {
        window.QuestRewards.updateParameterDisplays(this.params, this.answers);
    },
    
    // ========== UI Methods ==========
    showDoubleScreenFlash(type) {
        window.QuestUI.showDoubleScreenFlash(type);
    },
    
    showWordFlash(word) {
        QuestUI.showWordFlash(word);
    },
    
    showCoinAnimation(change) {
        window.QuestUI.showCoinAnimation(change);
    },
    
    showRewardAnimation(awarded) {
        window.QuestUI.showRewardAnimation(awarded);
    },
    
    showGrowthMindsetMessage() {
        window.QuestUI.showGrowthMindsetMessage();
    },
    
    showChestUnlockAnimation() {
        window.QuestUI.showChestUnlockAnimation();
    },
    
showCompletion(mastery, accuracy, completeData) {
        window.QuestUI.showCompletion(mastery, accuracy, completeData, () => {
        const overlay = document.querySelector('.quest-complete-overlay');
        if (overlay) overlay.style.display = 'none';
        // Reset progress bar when quest ends
        if (window.ProgressBarSystem) {
            window.ProgressBarSystem.reset();
        }
        this.exit();
    });
},
    
    // ========== Complete Quest ==========
    async completeQuest() {
        console.log('🏁 Completing quest...');
        
        if (window.DynamicModeSelector && window.DynamicModeSelector.speedTimerActive) {
            window.DynamicModeSelector.stopSpeedTimer();
        }
        
        const totalQuestions = this.questions.length;
        const correctAnswers = this.answers.filter(a => a.isCorrect).length;
        const mastery = Math.min(100, Math.max(0, Math.round((correctAnswers / totalQuestions) * 100)));
        const isQuestPassed = mastery >= 75;
        
        console.log(`   Mastery: ${mastery}%, Passed: ${isQuestPassed}`);
        
        try {
            const userId = window.App?.currentUser || 'student-001';
            const challengeId = this.challenge.id;
            
            // First, save the completed quest
            const completeResponse = await fetch('/api/quests/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    challengeId: challengeId,
                    questId: this.questData?.questId,
                    mastery: mastery,
                    answers: this.answers
                })
            });
            
            const completeData = await completeResponse.json();
            console.log('Quest completion saved:', completeData);
            
            if (isQuestPassed) {
                console.log('🎉 Quest completed! Playing celebration effects...');
                
                // Play quest complete sound
                let celebrationWord = null;
                if (window.MANYAAudioSystem && window.MANYAAudioSystem.playQuestComplete) {
                    celebrationWord = await window.MANYAAudioSystem.playQuestComplete();
                }
                
                // Show word flash
                if (celebrationWord) {
                    this.showWordFlash(celebrationWord);
                } else {
                    this.showWordFlash('Complete');
                }
                
                // Show quest complete flash
                this.showDoubleScreenFlash('quest-complete');
                
                // Show chest unlock animation
                this.showChestUnlockAnimation();
                
                // Standard celebration
                if (window.ConfettiService) {
                    window.ConfettiService.questComplete();
                }
                
                // Character celebration
                if (window.MANYACharacterSystem) {
                    window.MANYACharacterSystem.speak("Quest completed! You're amazing! 🎉", 3000);
                }
                
                // CHECK IF THIS WAS THE LAST QUEST IN THE CHALLENGE
                const totalQuestsInChallenge = this.challenge.totalQuests || 7;
                const completedQuestsAfter = completeData.completedQuests || 0;
                const isChallengeComplete = completedQuestsAfter >= totalQuestsInChallenge && isQuestPassed;
                
                console.log(`   Challenge check: completedQuests=${completedQuestsAfter}, totalQuests=${totalQuestsInChallenge}, isChallengeComplete=${isChallengeComplete}`);
                
                if (isChallengeComplete) {
                    console.log('🏆🏆🏆 CHALLENGE COMPLETE! Epic celebration starting... 🏆🏆🏆');
                    await this.celebrateChallengeComplete();
                }
                
                setTimeout(() => {
                    this.showCompletion(mastery, this.params.accuracy, completeData);
                }, 2500);
            } else {
                this.showCompletion(mastery, this.params.accuracy, completeData);
            }
            
        } catch (err) {
            console.error('Error completing quest:', err);
            this.exit();
        }
    },
    
    // Enhanced challenge complete celebration
    async celebrateChallengeComplete() {
        console.log('🎉🎉🎉 CHALLENGE COMPLETE! Epic celebration starting...');
        
        // Use the ChallengeCelebration component if available
        if (window.ChallengeCelebration) {
            window.ChallengeCelebration.show();
        } else {
            // Fallback celebration
            // Play the full complete.mp3
            try {
                const celebrationAudio = new Audio('/multimedia_assets/audios/challenge_complete/complete.mp3');
                celebrationAudio.volume = 0.9;
                celebrationAudio.play().catch(err => {
                    console.log('Challenge celebration audio play failed:', err);
                });
                window.currentCelebrationAudio = celebrationAudio;
            } catch (err) {
                console.log('Error playing challenge complete audio:', err);
            }
            
            // INTENSE confetti and fireworks
            if (window.ConfettiService) {
                window.ConfettiService.challengeCompleteCelebration();
            }
            
            // Multiple golden screen flashes
            this.showDoubleScreenFlash('challenge-complete');
            setTimeout(() => {
                this.showDoubleScreenFlash('challenge-complete');
            }, 400);
            setTimeout(() => {
                this.showDoubleScreenFlash('challenge-complete');
            }, 800);
            
            // Show challenge complete modal
            this.showChallengeCompleteModal();
            
            // Character epic celebration
            if (window.MANYACharacterSystem) {
                window.MANYACharacterSystem.speak("CHALLENGE COMPLETE! You're a true champion! 🏆🎉✨", 5000);
            }
            
            // Play additional fanfare
            setTimeout(() => {
                try {
                    const fanfare = new Audio('/multimedia_assets/audios/fanfare-trumpets.mp3');
                    fanfare.volume = 0.7;
                    fanfare.play().catch(() => {});
                } catch (err) {}
            }, 500);
        }
    },
    // Create compact gem display
createCompactGemDisplay() {
    const container = document.getElementById('gem-display-compact');
    if (!container) return;
    
    container.innerHTML = `
        <div class="compact-gems">
            <div class="compact-gem math">
                <img src="/multimedia_assets/gems/math_gem.svg" class="compact-gem-icon">
                <span id="compact-math-gems">0</span>
            </div>
            <div class="compact-gem english">
                <img src="/multimedia_assets/gems/english_gem.svg" class="compact-gem-icon">
                <span id="compact-english-gems">0</span>
            </div>
            <div class="compact-gem science">
                <img src="/multimedia_assets/gems/science_svg.svg" class="compact-gem-icon">
                <span id="compact-science-gems">0</span>
            </div>
            <div class="compact-gem social">
                <img src="/multimedia_assets/gems/sst_gem.svg" class="compact-gem-icon">
                <span id="compact-social-gems">0</span>
            </div>
            <div class="compact-gem master">
                <img src="/multimedia_assets/gems/master_gem.svg" class="compact-gem-icon">
                <span id="compact-master-gems">0</span>
            </div>
        </div>
    `;
    
    // Add CSS for compact gems
    const style = document.createElement('style');
    style.textContent = `
        .compact-gems {
            display: flex;
            gap: 8px;
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 12px;
            flex-wrap: wrap;
        }
        .compact-gem {
            display: flex;
            align-items: center;
            gap: 4px;
            background: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .compact-gem-icon {
            width: 18px;
            height: 18px;
        }
        .compact-gem.math { color: #3b82f6; }
        .compact-gem.english { color: #8b5cf6; }
        .compact-gem.science { color: #10b981; }
        .compact-gem.social { color: #f59e0b; }
        .compact-gem.master { color: #fbbf24; }
        .stats-row {
            display: flex;
            gap: 12px;
            padding: 8px 20px;
            background: white;
            border-bottom: 1px solid #e2e8f0;
            flex-wrap: wrap;
            position: sticky;
            top: 0;
            z-index: 40;
        }
        #progress-bar-compact {
            flex: 2;
            min-width: 200px;
        }
        #gem-display-compact {
            flex: 1;
            min-width: 280px;
        }
        @media (max-width: 768px) {
            .stats-row {
                flex-direction: column;
                padding: 8px 12px;
            }
            .compact-gems {
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
},

// Update gem display values
updateCompactGemDisplay(subject, count) {
    const element = document.getElementById(`compact-${subject}-gems`);
    if (element) {
        element.textContent = count;
    }
},
    showChallengeCompleteModal() {
        const modal = document.createElement('div');
        modal.className = 'challenge-complete-overlay';
        modal.innerHTML = `
            <div class="challenge-complete-card">
                <div class="challenge-complete-icon">🏆✨🎉</div>
                <div class="challenge-complete-title">CHALLENGE COMPLETE!</div>
                <div class="challenge-complete-message">
                    Congratulations! You've mastered this challenge!<br>
                    🌟 New challenges await! 🌟
                </div>
                <button class="challenge-complete-btn" id="close-challenge-modal">Continue Journey →</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('#close-challenge-modal');
        closeBtn.onclick = () => {
            modal.remove();
            if (window.currentCelebrationAudio) {
                window.currentCelebrationAudio.pause();
                window.currentCelebrationAudio.currentTime = 0;
                window.currentCelebrationAudio = null;
            }
        };
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.style.animation = 'fadeOut 0.5s ease';
                setTimeout(() => {
                    if (modal.parentNode) modal.remove();
                }, 500);
            }
        }, 10000);
    },
    
    // ========== Lifecycle Methods ==========
    startHesitationTracking() {
        window.QuestCore.startHesitationTracking(this);
    },
    
    async loadPsychologicalParams() {
        await window.QuestCore.loadPsychologicalParams(this);
    },
    
    handleTimeUp() {
        window.QuestCore.handleTimeUp(this);
    },
    
    exit() {
        // Reset progress bar
        if (window.ProgressBarSystem) {
            window.ProgressBarSystem.reset();
        }
          // Reset like button system
    if (window.LikeButtonSystem) {
        window.LikeButtonSystem.reset();
    }
        window.QuestCore.exit(this);
   
    }
};

// Add modal styles on load
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes modalRise {
            from { opacity: 0; transform: translate(-50%, -45%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes fadeOut {
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        }
        @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-50px); }
        }
        @keyframes chestPop {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes chestFadeOut {
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
        @keyframes growthPop {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
    `;
    document.head.appendChild(style);
}

window.QuestScreen = QuestScreen;
console.log('✅ QuestScreen registered globally');
