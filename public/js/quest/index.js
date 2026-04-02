// quest/index.js - Main QuestScreen Object
import { QuestUtils } from './utils.js';
import { QuestUI } from './ui.js';
import { QuestRewards } from './rewards.js';
import { QuestAnswer } from './answer.js';
import { QuestStudy } from './study.js';
import { QuestCore } from './core.js';

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
        QuestCore.init(questData, challenge, onComplete, this);
    },
    
    loadNextContent() {
        QuestCore.loadNextContent(this);
    },
    
    loadQuestion(index) {
        QuestCore.loadQuestion(index, this);
    },
    
    // ========== Answer Methods ==========
    selectOption(letter) {
        QuestAnswer.selectOption(letter, this);
    },
    
    renderOptions(question) {
        QuestAnswer.renderOptions(question, (letter) => this.selectOption(letter));
    },
    
    async getHint() {
        const question = this.questions[this.currentQuestionIndex];
        await QuestAnswer.getHint(question.id, this.hintDisplay, (used) => { this.hintUsed = used; }, this.hintBtn);
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
        const question = this.questions[this.currentQuestionIndex];
        const correctAnswer = QuestUtils.extractCorrectLetter(question.correctAnswer);
        const isCorrect = this.selectedOption === correctAnswer;
        
        console.log(`   Answer: ${this.selectedOption}, Correct: ${correctAnswer}, Result: ${isCorrect ? '✅' : '❌'}`);
        
        // Track rewards
        let coinResult = null;
        try {
            await QuestRewards.trackEmotion(window.App?.currentUser || 'student-001', 
                isCorrect ? 'confident' : 'frustrated', isCorrect ? 80 : 60, 'answer_submitted', responseTime);
            await QuestRewards.trackReward(window.App?.currentUser || 'student-001', 
                isCorrect, this.hintUsed, this.currentSubject, (awarded) => QuestUI.showRewardAnimation(awarded));
            await QuestRewards.updateStreak(window.App?.currentUser || 'student-001', isCorrect, window.MANYACharacterSystem);
            coinResult = await QuestRewards.updateCoins(window.App?.currentUser || 'student-001', 
                isCorrect, this.hintUsed, (balance) => QuestRewards.updateCoinDisplay(balance));
            
            if (coinResult && coinResult.coinChange !== undefined) {
                QuestUI.showCoinAnimation(coinResult.coinChange);
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
        
        // Handle based on correct/wrong
        if (isCorrect) {
            console.log('   CORRECT - Playing effects, no modal');
            
            QuestUI.showDoubleScreenFlash('correct');
            
            let word = null;
            if (window.MANYAAudioSystem) {
                word = await window.MANYAAudioSystem.playCorrect();
            }
            
            if (word) {
                QuestUI.showWordFlash(word);
            } else {
                QuestUI.showWordFlash('Great');
            }
            
            if (window.MANYACharacterSystem) {
                window.MANYACharacterSystem.speak(window.MANYACharacterSystem.getCharacter().messages.correct, 2000);
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
    QuestUI.showLearningModal(
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
}
    },
    
    // ========== Study Methods ==========
    showStudySim(studySim) {
        QuestStudy.showStudySim(studySim, this);
    },
    
    addStudyMessage() {
        QuestStudy.addStudyMessage();
    },
    
    setupStudyContinueButton(studySim) {
        QuestStudy.setupStudyContinueButton(studySim, this);
    },
    
    loadSimulationQuestion(question) {
        QuestStudy.loadSimulationQuestion(question, this);
    },
    
    setupLabelingSim(question) {
        QuestStudy.setupLabelingSim(question, this);
    },
    
    // ========== Utility Methods ==========
    extractCorrectLetter(correctAnswer) {
        return QuestUtils.extractCorrectLetter(correctAnswer);
    },
    
    detectSubject(questData, challenge) {
        return QuestUtils.detectSubject(questData, challenge);
    },
    
    getOptionText(question, letter) {
        return QuestUtils.getOptionText(question, letter);
    },
    
    loadScript(src) {
        return QuestUtils.loadScript(src);
    },
    
    // ========== Reward Methods ==========
    async trackEmotion(emotion, intensity, context, responseTime) {
        return QuestRewards.trackEmotion(window.App?.currentUser || 'student-001', emotion, intensity, context, responseTime);
    },
    
    async trackReward(isCorrect, hintUsed, subject) {
        return QuestRewards.trackReward(window.App?.currentUser || 'student-001', isCorrect, hintUsed, subject, (awarded) => QuestUI.showRewardAnimation(awarded));
    },
    
    async updateStreak(isCorrect) {
        return QuestRewards.updateStreak(window.App?.currentUser || 'student-001', isCorrect, window.MANYACharacterSystem);
    },
    
    async updateCoins(isCorrect, hintUsed) {
        return QuestRewards.updateCoins(window.App?.currentUser || 'student-001', isCorrect, hintUsed, (balance) => QuestRewards.updateCoinDisplay(balance));
    },
    
    updateCoinDisplay(balance) {
        QuestRewards.updateCoinDisplay(balance);
    },
    
    updateParameterDisplays() {
        QuestRewards.updateParameterDisplays(this.params, this.answers);
    },
    
    // ========== UI Methods ==========
    showDoubleScreenFlash(type) {
        QuestUI.showDoubleScreenFlash(type);
    },
    
    showWordFlash(word) {
        QuestUI.showWordFlash(word);
    },
    
    showCoinAnimation(change) {
        QuestUI.showCoinAnimation(change);
    },
    
    showRewardAnimation(awarded) {
        QuestUI.showRewardAnimation(awarded);
    },
    
    showGrowthMindsetMessage() {
        QuestUI.showGrowthMindsetMessage();
    },
    
    showLearningModal(question, correctAnswer, responseTime) {
        const self = this;
        QuestUI.showLearningModal(question, this.selectedOption, this.getOptionText.bind(this), function() {
            document.querySelectorAll('.option.gentle-highlight').forEach(opt => {
                opt.classList.remove('gentle-highlight');
            });
            self.currentQuestionIndex++;
            self.loadNextContent();
        });
    },
    
    showChestUnlockAnimation() {
        QuestUI.showChestUnlockAnimation();
    },
    
    showCompletion(mastery) {
        QuestUI.showCompletion(mastery, this.params.accuracy, () => {
            const overlay = document.querySelector('.quest-complete-overlay');
            if (overlay) overlay.style.display = 'none';
            this.exit();
        });
    },
    
    // ========== Complete Quest ==========
async completeQuest() {
    console.log('🏁 Completing quest...');
    
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
            // Get current challenge progress from the response
            const totalQuestsInChallenge = this.challenge.totalQuests || 7;
            const completedQuestsAfter = completeData.completedQuests || 0;
            const isChallengeComplete = completedQuestsAfter >= totalQuestsInChallenge && isQuestPassed;
            
            console.log(`   Challenge check: completedQuests=${completedQuestsAfter}, totalQuests=${totalQuestsInChallenge}, isChallengeComplete=${isChallengeComplete}`);
            
            if (isChallengeComplete) {
                console.log('🏆🏆🏆 CHALLENGE COMPLETE! Epic celebration starting... 🏆🏆🏆');
                await this.celebrateChallengeComplete();
            }
            
            setTimeout(() => {
                this.showCompletion(mastery);
            }, 2500);
        } else {
            this.showCompletion(mastery);
        }
        
    } catch (err) {
        console.error('Error completing quest:', err);
        this.exit();
    }
},

// Enhanced challenge complete celebration
async celebrateChallengeComplete() {
    console.log('🎉🎉🎉 CHALLENGE COMPLETE! Epic celebration starting...');
    
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
    
    // INTENSE confetti and fireworks - full screen celebration
    if (window.ConfettiService) {
        window.ConfettiService.challengeCompleteCelebration();
    }
    
    // Multiple golden screen flashes (3 flashes for epic celebration)
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
    
    // Auto-close after 12 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => {
                if (modal.parentNode) modal.remove();
            }, 500);
        }
    }, 12000);
},

// New method for challenge complete celebration
async celebrateChallengeComplete() {
    console.log('🎉🎉🎉 CHALLENGE COMPLETE! Epic celebration starting...');
    
    // Play the full complete.mp3
    if (window.MANYAAudioSystem) {
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
    }
    
    // INTENSE confetti and fireworks - full screen celebration
    if (window.ConfettiService) {
        window.ConfettiService.challengeCompleteCelebration();
    }
    
    // Show challenge complete modal (card in center, effects all around)
    this.showChallengeCompleteModal();
    
    // Multiple golden screen flashes
    this.showDoubleScreenFlash('challenge-complete');
    setTimeout(() => {
        this.showDoubleScreenFlash('challenge-complete');
    }, 400);
    
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
    
    // Auto-close after 10 seconds (but celebration continues)
    setTimeout(() => {
        if (modal.parentNode) {
            modal.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => {
                if (modal.parentNode) modal.remove();
            }, 500);
        }
    }, 10000);
},

// Show challenge complete modal
showChallengeCompleteModal() {
    const modal = document.createElement('div');
    modal.className = 'challenge-complete-overlay';
    modal.innerHTML = `
        <div class="challenge-complete-card">
            <div class="challenge-complete-icon">🏆</div>
            <div class="challenge-complete-title">CHALLENGE COMPLETE!</div>
            <div class="challenge-complete-message">
                Congratulations! You've mastered this challenge!<br>
                New challenges await!
            </div>
            <button class="challenge-complete-btn" id="close-challenge-modal">Continue Journey →</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('#close-challenge-modal');
    closeBtn.onclick = () => {
        modal.remove();
        // Stop celebration audio if still playing
        if (window.currentCelebrationAudio) {
            window.currentCelebrationAudio.pause();
            window.currentCelebrationAudio.currentTime = 0;
            window.currentCelebrationAudio = null;
        }
    };
    
    // Auto-close after 8 seconds (but audio continues)
    setTimeout(() => {
        if (modal.parentNode) {
            modal.remove();
        }
    }, 8000);
},
    
    // ========== Lifecycle Methods ==========
    startHesitationTracking() {
        QuestCore.startHesitationTracking(this);
    },
    
    async loadPsychologicalParams() {
        await QuestCore.loadPsychologicalParams(this);
    },
    
    handleTimeUp() {
        QuestCore.handleTimeUp(this);
    },
    
    exit() {
        QuestCore.exit(this);
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