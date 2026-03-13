// quest.js - Complete Version with Simulation Support
const QuestScreen = {
    questData: null,
    challenge: null,
    currentQuestionIndex: 0,
    questions: [],
    answers: [],
    hintUsed: false,
    hintDisplayed: false,
    onComplete: null,
    
    // Selection tracking
    selectedOption: null,
    answerSubmitted: false,
    
    // DOM elements (will be set after render)
    hintBtn: null,
    submitBtn: null,
    hintDisplay: null,
    
    // Tracking parameters
    startTime: null,
    questionStartTime: null,
    hesitationCount: 0,
    hesitationTimer: null,
    lastAnswerTime: null,
    answerChanged: false,
    changeCount: 0,
    
    // Psychological parameters
    params: {
        accuracy: 0,
        mastery: 0,
        confidence: 70,
        frustration: 0,
        hintUsage: 0,
        hesitationRate: 0
    },
    
    init(questData, challenge, onComplete) {
        console.log('🎮 Initializing quest:', questData);
        
        // Use 'this' not QuestScreen
        this.questData = questData;
        this.challenge = challenge;
        this.questions = questData.questions || [];
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.onComplete = onComplete;
        
        // Reset tracking
        this.startTime = Date.now();
        this.hesitationCount = 0;
        this.params.frustration = 0;
        this.params.confidence = 70;
        this.hintUsed = false;
        this.selectedOption = null;
        this.answerSubmitted = false;
        this.answerChanged = false;
        this.changeCount = 0;
        
        this.render();
        this.loadQuestion(0);
        this.startHesitationTracking();
        this.loadPsychologicalParams();
        
        // Initialize game mode
        if (questData.gameMode && questData.gameMode !== 'none') {
            if (window.GameModes) {
                window.GameModes.init(
                    questData.gameMode,
                    questData.gameMode === 'timed' ? 30 : null,
                    () => this.handleTimeUp()
                );
            }
        }
        
        // Show question decision info
        this.updateQuestionDecision(questData.metadata);
    },
    
    render() {
        const template = document.getElementById('gameplay-view').content.cloneNode(true);
        const self = this; // Capture 'this' for nested functions
        
        // Set quest info
        const questNameEl = template.querySelector('.current-quest-name');
        if (questNameEl) questNameEl.textContent = this.questData.name;
        
        const counterEl = template.querySelector('.question-counter');
        if (counterEl) counterEl.textContent = `0/${this.questions.length}`;
        
        // Back button
        const backBtn = template.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (confirm('Exit quest? Your progress will not be saved.')) {
                    self.exit(); // Use self, not QuestScreen
                }
            });
        }
        
        // Hint button
        const hintBtn = template.querySelector('.hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => self.getHint()); // Use self
        }
        
        // Submit button
        const submitBtn = template.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => self.submitAnswer()); // Use self
        }
        
        // Update content area
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error('❌ Content area not found!');
            return;
        }
        
        contentArea.innerHTML = '';
        contentArea.appendChild(template);
        
        // Store references after they're in the DOM
        setTimeout(() => {
            self.hintBtn = document.getElementById('hintBtn');
            self.submitBtn = document.getElementById('submitBtn');
            self.hintDisplay = document.getElementById('hintDisplay');
            
            console.log('✅ DOM elements referenced:', {
                hintBtn: !!self.hintBtn,
                submitBtn: !!self.submitBtn,
                hintDisplay: !!self.hintDisplay
            });
        }, 100);
    },
    
    async loadPsychologicalParams() {
        try {
            const response = await fetch(`/api/psychological/state/${window.App?.currentUser || 'student-001'}`);
            const data = await response.json();
            
            this.params.confidence = data.confidence || 70;
            this.params.frustration = data.frustration || 0;
            
            this.updateParameterDisplays();
        } catch (err) {
            console.error('Error loading psychological params:', err);
        }
    },
    
    startHesitationTracking() {
        this.questionStartTime = Date.now();
        const self = this; // Capture for interval
        
        // Track hesitation (no activity for 5 seconds)
        if (this.hesitationTimer) {
            clearInterval(this.hesitationTimer);
        }
        
        this.hesitationTimer = setInterval(() => {
            const timeOnQuestion = (Date.now() - self.questionStartTime) / 1000;
            
            if (timeOnQuestion > 5 && !self.answerSubmitted && !self.selectedOption) {
                self.hesitationCount++;
                self.params.hesitationRate = (self.hesitationCount / (self.currentQuestionIndex + 1)) * 100;
                
                self.updateParameterDisplays();
                
                // Update frustration based on hesitation
                self.params.frustration = Math.min(100, self.params.frustration + 2);
                
                // Show subtle reminder
                if (timeOnQuestion > 10 && timeOnQuestion % 5 === 0) {
                    self.showTemporaryMessage('Still thinking? Take your time!');
                }
            }
        }, 1000);
    },
    
    showTemporaryMessage(msg) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'temp-message';
        msgDiv.textContent = msg;
        msgDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 30px;
            font-size: 0.9em;
            z-index: 1000;
            animation: fadeInOut 2s ease;
        `;
        document.body.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 2000);
    },
    
    async loadQuestion(index) {
        if (index >= this.questions.length) {
            this.completeQuest();
            return;
        }
        
        this.currentQuestionIndex = index;
        const question = this.questions[index];
        
        console.log(`📝 Loading question ${index + 1}:`, question.id);
        
        // Check if this is a simulation
        if (question.question_type === 'SIM') {
            await this.loadSimulationQuestion(question);
            return;
        }
        
        // Clear hesitation timer for previous question
        if (this.hesitationTimer) {
            clearInterval(this.hesitationTimer);
        }
        
        // Reset selection state
        this.selectedOption = null;
        this.answerSubmitted = false;
        this.hintUsed = false;
        this.hintDisplayed = false;
        this.answerChanged = false;
        this.changeCount = 0;
        
        // Update counter
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) counterEl.textContent = `${index + 1}/${this.questions.length}`;
        
        // Set question text
        const questionTextEl = document.querySelector('.question-text');
        if (questionTextEl) questionTextEl.textContent = question.text;
        
        // Set topic badge
        const topicBadgeEl = document.querySelector('.topic-badge');
        if (topicBadgeEl) topicBadgeEl.textContent = this.challenge.name;
        
        // Set difficulty badge
        const difficultyEl = document.querySelector('.difficulty-badge');
        if (difficultyEl) {
            const difficulty = question.difficulty || 'M';
            difficultyEl.textContent = difficulty === 'E' ? 'Easy' : 
                                      difficulty === 'M' ? 'Medium' : 'Hard';
            difficultyEl.className = 'difficulty-badge ' + 
                (difficulty === 'E' ? 'easy' : difficulty === 'M' ? 'medium' : 'hard');
        }
        
        // Render options
        this.renderOptions(question);
        
        // Reset hint
        if (this.hintDisplay) {
            this.hintDisplay.style.display = 'none';
            this.hintDisplay.textContent = '';
        }
        
        if (this.hintBtn) this.hintBtn.disabled = false;
        if (this.submitBtn) this.submitBtn.disabled = true;
        
        // Reset question timer
        this.questionStartTime = Date.now();
        this.startHesitationTracking();
    },
    
    renderOptions(question) {
        const optionsContainer = document.getElementById('options-container');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        const self = this; // Capture for event listeners
        
        const letters = ['A', 'B', 'C', 'D'];
        letters.forEach(letter => {
            const optionText = question.options[letter];
            if (!optionText) return;
            
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.dataset.letter = letter;
            optionDiv.innerHTML = `<span class="option-letter">${letter}.</span> ${optionText}`;
            
            optionDiv.addEventListener('click', () => self.selectOption(letter));
            
            optionsContainer.appendChild(optionDiv);
        });
    },
    
    selectOption(letter) {
        if (this.answerSubmitted) return;
        
        console.log(`🔘 Selected option: ${letter}`);
        
        // Track answer changes (HESITATION!)
        if (this.selectedOption && this.selectedOption !== letter) {
            this.answerChanged = true;
            this.changeCount++;
            console.log(`🔄 Answer changed! (${this.changeCount} changes)`);
        }
        
        // Remove selected class from all options
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected class to chosen option
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.dataset.letter === letter) {
                opt.classList.add('selected');
            }
        });
        
        this.selectedOption = letter;
        if (this.submitBtn) this.submitBtn.disabled = false;
        
        // If they selected quickly, boost confidence
        const responseTime = (Date.now() - this.questionStartTime) / 1000;
        if (responseTime < 3) {
            this.params.confidence = Math.min(100, this.params.confidence + 1);
            this.updateParameterDisplays();
        }
    },
    
    async submitAnswer() {
        if (!this.selectedOption || this.answerSubmitted) {
            console.log('❌ Cannot submit: no option selected or already submitted');
            return;
        }
        
        console.log(`📤 Submitting answer: ${this.selectedOption}`);
        
        // Stop hesitation tracking
        if (this.hesitationTimer) {
            clearInterval(this.hesitationTimer);
        }
        
        this.answerSubmitted = true;
        if (this.submitBtn) this.submitBtn.disabled = true;
        if (this.hintBtn) this.hintBtn.disabled = true;
        
        // Disable all options
        document.querySelectorAll('.option').forEach(opt => {
            opt.style.pointerEvents = 'none';
        });
        
        // Calculate response time
        const responseTime = (Date.now() - this.questionStartTime) / 1000;
        
        const question = this.questions[this.currentQuestionIndex];
        const correctAnswer = this.extractCorrectLetter(question.correctAnswer);
        const isCorrect = this.selectedOption === correctAnswer;
        
        console.log(`✅ Correct answer: ${correctAnswer}, User was ${isCorrect ? 'right' : 'wrong'}`);
        
        // Update psychological parameters
        if (!isCorrect) {
            this.params.frustration = Math.min(100, this.params.frustration + 15);
            this.params.confidence = Math.max(0, this.params.confidence - 10);
        } else {
            this.params.frustration = Math.max(0, this.params.frustration - 5);
            this.params.confidence = Math.min(100, this.params.confidence + 5);
        }
        
        // Show correct/incorrect highlighting
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.dataset.letter === correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.dataset.letter === this.selectedOption && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });
        
        // Update parameters display
        this.updateParameterDisplays();
        
        // Show detailed feedback
        await this.showDetailedFeedback(this.selectedOption, correctAnswer, isCorrect, question, responseTime);
    },
    
    async showDetailedFeedback(selected, correct, isCorrect, question, responseTime) {
        // Create feedback modal
        const feedbackModal = document.createElement('div');
        feedbackModal.className = 'feedback-card-detailed';
        const self = this; // Capture for continue button
        
        // Get detailed solution
        let detailedSolution = "Loading explanation...";
        try {
            const response = await fetch(`/api/solution/${question.id}`);
            const data = await response.json();
            detailedSolution = data.detailedSolution || "No detailed solution available.";
        } catch (err) {
            console.error('Error loading detailed solution:', err);
            detailedSolution = "Unable to load explanation at this time.";
        }
        
        feedbackModal.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-icon-large">${isCorrect ? '🎉' : '💪'}</span>
                <span class="feedback-title ${isCorrect ? 'correct' : 'incorrect'}">
                    ${isCorrect ? 'Correct!' : 'Not quite right'}
                </span>
            </div>
            
            <div class="feedback-comparison">
                <div class="comparison-row">
                    <span class="comparison-label">Your answer:</span>
                    <span class="your-answer">${selected} - ${this.getOptionText(question, selected)}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Correct answer:</span>
                    <span class="correct-answer">${correct} - ${this.getOptionText(question, correct)}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Response time:</span>
                    <span>${responseTime.toFixed(1)}s</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Hint used:</span>
                    <span>${this.hintUsed ? 'Yes' : 'No'}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Answer changes:</span>
                    <span>${this.changeCount}</span>
                </div>
            </div>
            
            <div class="detailed-solution">
                <h4>📚 Explanation</h4>
                <p>${detailedSolution}</p>
            </div>
            
            <div class="feedback-actions">
                <button class="feedback-btn primary" id="continue-feedback-btn">Continue</button>
            </div>
        `;
        
        document.body.appendChild(feedbackModal);
        
        // Add continue button handler
        document.getElementById('continue-feedback-btn').addEventListener('click', () => {
            feedbackModal.remove();
            self.continueAfterFeedback();
        });
        
        // Track answer
        this.answers.push({
            questionId: question.id,
            selectedAnswer: selected,
            correctAnswer: correct,
            isCorrect: isCorrect,
            timeSpent: responseTime * 1000,
            hintUsed: this.hintUsed,
            answerChanged: this.answerChanged,
            changeCount: this.changeCount,
            hesitationCount: this.hesitationCount,
            confidenceAtAnswer: this.params.confidence,
            frustrationAtAnswer: this.params.frustration
        });
        
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
        
        // Update hint usage rate
        const hintsUsed = this.answers.filter(a => a.hintUsed).length;
        this.params.hintUsage = (hintsUsed / this.answers.length) * 100;
        
        // Update mastery
        this.params.mastery = Math.min(100, 
            this.params.accuracy - (hintsUsed / this.answers.length) * 15
        );
        
        this.updateParameterDisplays();
        
        // Game mode specific feedback
        if (window.GameModes) window.GameModes.questionAnswered();
    },
    
    getOptionText(question, letter) {
        return question.options[letter] || '';
    },
    
    continueAfterFeedback() {
        // Move to next question
        this.loadQuestion(this.currentQuestionIndex + 1);
    },
    
    async getHint() {
        if (this.hintUsed || this.answerSubmitted) {
            console.log('❌ Cannot get hint: already used or answer submitted');
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        console.log(`💡 Getting hint for question: ${question.id}`);
        
        try {
            const response = await fetch(`/api/hint/${question.id}`);
            const data = await response.json();
            
            console.log('✅ Hint received:', data);
            
            if (this.hintDisplay) {
                this.hintDisplay.textContent = data.hint || "Think carefully about what you've learned!";
                this.hintDisplay.style.display = 'block';
            }
            
            this.hintUsed = true;
            if (this.hintBtn) this.hintBtn.disabled = true;
            
            // Update parameters - hint usage affects confidence
            this.params.confidence = Math.max(0, this.params.confidence - 5);
            this.params.hintUsage = ((this.answers.filter(a => a.hintUsed).length + 1) / (this.answers.length + 1)) * 100;
            this.updateParameterDisplays();
            
        } catch (err) {
            console.error('❌ Error getting hint:', err);
            alert('Failed to load hint. Please try again.');
        }
    },
    
    updateParameterDisplays() {
        // Update accuracy
        const accuracyEl = document.getElementById('param-accuracy');
        if (accuracyEl) accuracyEl.textContent = Math.round(this.params.accuracy) + '%';
        
        // Update mastery
        const masteryEl = document.getElementById('param-mastery');
        if (masteryEl) masteryEl.textContent = Math.round(this.params.mastery) + '%';
        
        let masteryLevel = 'learning';
        if (this.params.mastery >= 80) masteryLevel = 'mastered';
        else if (this.params.mastery >= 60) masteryLevel = 'progressing';
        else if (this.params.mastery < 40) masteryLevel = 'struggling';
        
        const masteryLevelEl = document.getElementById('mastery-level');
        if (masteryLevelEl) masteryLevelEl.textContent = masteryLevel;
        
        // Update confidence
        const confidenceEl = document.getElementById('param-confidence');
        if (confidenceEl) confidenceEl.textContent = Math.round(this.params.confidence) + '%';
        
        const confidenceBar = document.getElementById('confidence-bar');
        if (confidenceBar) confidenceBar.style.width = this.params.confidence + '%';
        
        // Update frustration
        const frustrationEl = document.getElementById('param-frustration');
        if (frustrationEl) frustrationEl.textContent = Math.round(this.params.frustration) + '%';
        
        const frustrationBar = document.getElementById('frustration-bar');
        if (frustrationBar) frustrationBar.style.width = this.params.frustration + '%';
        
        // Update hint usage
        const hintsEl = document.getElementById('param-hints');
        if (hintsEl) hintsEl.textContent = Math.round(this.params.hintUsage) + '%';
        
        const hintCount = this.answers.filter(a => a.hintUsed).length;
        const hintCountEl = document.getElementById('hint-count');
        if (hintCountEl) hintCountEl.textContent = `${hintCount} used`;
        
        // Update hesitation - NOW WITH ANSWER CHANGES!
        const hesitationEl = document.getElementById('param-hesitation');
        if (hesitationEl) {
            // Calculate hesitation score based on answer changes and time
            let hesitationScore = 0;
            if (this.answerChanged) hesitationScore += 40;
            if (this.changeCount >= 2) hesitationScore += 20;
            
            const responseTime = this.questionStartTime ? 
                (Date.now() - this.questionStartTime) / 1000 : 0;
            if (responseTime > 30) hesitationScore += 25;
            else if (responseTime > 15) hesitationScore += 15;
            
            hesitationEl.textContent = Math.min(100, hesitationScore) + '%';
        }
        
        const hesitationCountEl = document.getElementById('hesitation-count');
        if (hesitationCountEl) hesitationCountEl.textContent = `${this.changeCount} changes`;
        
        const hesitationTypeEl = document.getElementById('hesitation-type');
        if (hesitationTypeEl) {
            hesitationTypeEl.textContent = this.answerChanged ? 
                '🔄 changed answer' : '⏱️ no changes';
        }
    },
    
    updateQuestionDecision(metadata) {
        if (!metadata) return;
        
        const scoreEl = document.getElementById('question-score');
        if (scoreEl) scoreEl.textContent = metadata.priority || 'N/A';
        
        const reasonEl = document.getElementById('question-reason');
        if (reasonEl) reasonEl.textContent = metadata.reason || 'No reason available';
        
        const factorsContainer = document.getElementById('question-factors');
        if (factorsContainer) {
            factorsContainer.innerHTML = '';
            
            if (metadata.factors && metadata.factors.length) {
                metadata.factors.forEach(factor => {
                    const tag = document.createElement('span');
                    tag.className = 'factor-tag';
                    tag.textContent = factor;
                    factorsContainer.appendChild(tag);
                });
            }
        }
    },
    
    handleTimeUp() {
        if (this.answerSubmitted) return;
        
        const question = this.questions[this.currentQuestionIndex];
        
        this.answers.push({
            questionId: question.id,
            selectedAnswer: null,
            correctAnswer: this.extractCorrectLetter(question.correctAnswer),
            isCorrect: false,
            timeSpent: (Date.now() - this.questionStartTime),
            hintUsed: false,
            answerChanged: this.answerChanged,
            changeCount: this.changeCount,
            hesitationCount: this.hesitationCount,
            confidenceAtAnswer: this.params.confidence,
            frustrationAtAnswer: this.params.frustration
        });
        
        // Show timeout feedback
        alert('Time\'s up! Moving to next question.');
        this.loadQuestion(this.currentQuestionIndex + 1);
    },
    
    async completeQuest() {
        console.log('🏁 Completing quest...');
        
        // Calculate final mastery
        const totalQuestions = this.questions.length;
        const correctAnswers = this.answers.filter(a => a.isCorrect).length;
        const hintsUsed = this.answers.filter(a => a.hintUsed).length;
        
        let mastery = (correctAnswers / totalQuestions) * 100;
        mastery -= (hintsUsed / totalQuestions) * 15;
        
        if (this.questData.gameMode === 'quickfire') mastery += 5;
        
        mastery = Math.min(100, Math.max(0, Math.round(mastery)));
        
        // Send to server
        try {
            const response = await fetch('/api/quests/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: window.App?.currentUser || 'student-001',
                    challengeId: this.challenge.id,
                    questId: this.questData.questId,
                    mastery: mastery,
                    answers: this.answers,
                    finalParams: {
                        accuracy: this.params.accuracy,
                        confidence: this.params.confidence,
                        frustration: this.params.frustration,
                        hintUsage: this.params.hintUsage,
                        hesitationRate: this.params.hesitationRate,
                        answerChanges: this.changeCount
                    }
                })
            });
            
            const result = await response.json();
            
            // Show completion screen
            this.showCompletion(mastery, result.nextUnlocked);
            
        } catch (err) {
            console.error('❌ Error completing quest:', err);
            alert('Error saving progress. Please try again.');
            this.exit();
        }
    },
    
    showCompletion(mastery, nextUnlocked) {
        const overlay = document.querySelector('.quest-complete-overlay');
        if (!overlay) return;
        const self = this; // Capture for continue button
        
        overlay.querySelector('.mastery-score').textContent = mastery + '%';
        overlay.querySelector('.earned-rewards').innerHTML = `
            <div>✨ Mastery: ${mastery}%</div>
            <div>📊 Accuracy: ${Math.round(this.params.accuracy)}%</div>
            <div>💪 Confidence: ${Math.round(this.params.confidence)}%</div>
            <div>😤 Frustration: ${Math.round(this.params.frustration)}%</div>
            <div>🔄 Answer changes: ${this.changeCount}</div>
            ${nextUnlocked ? '<div style="color:#48bb78; margin-top:10px;">🔓 Next Quest Unlocked!</div>' : ''}
        `;
        
        overlay.querySelector('.continue-btn').onclick = () => {
            overlay.style.display = 'none';
            self.exit();
        };
        
        overlay.style.display = 'flex';
        
        // Reset game mode
        if (window.GameModes) window.GameModes.reset();
    },
    
    exit() {
        if (this.onComplete) {
            this.onComplete();
        }
    },
    
    extractCorrectLetter(correctAnswer) {
        if (!correctAnswer) return 'A';
        if (correctAnswer.startsWith('Option_')) {
            return correctAnswer.replace('Option_', '');
        }
        if (correctAnswer.length === 1 && ['A','B','C','D'].includes(correctAnswer)) {
            return correctAnswer;
        }
        return 'A';
    },
    
    // ============= SIMULATION METHODS =============
    
    async loadSimulationQuestion(question) {
        // Show loading indicator
        this.showLoading('Loading 3D simulation...');
        
        try {
            // Initialize simulation loader if needed
            if (!window.SimulationLoader) {
                await this.loadScript('js/simulation-loader.js');
                await SimulationLoader.init();
            }
            
            // Hide standard MCQ elements
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) optionsContainer.style.display = 'none';
            
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) submitBtn.style.display = 'none';
            
            const hintBtn = document.querySelector('.hint-btn');
            if (hintBtn) hintBtn.style.display = 'none';
            
            // Create container for simulation
            const simContainer = document.createElement('div');
            simContainer.id = 'simulation-container';
            simContainer.style.width = '100%';
            simContainer.style.minHeight = '500px';
            simContainer.style.marginTop = '20px';
            
            // Insert after question text
            const questionText = document.querySelector('.question-text');
            questionText.parentNode.insertBefore(simContainer, questionText.nextSibling);
            
            // Load simulation
            const simElement = await SimulationLoader.loadSimulation(question);
            simContainer.appendChild(simElement);
            
            // Add done button
            this.setupSimulationControls(question);
            
            // Update counter
            const counterEl = document.querySelector('.question-counter');
            if (counterEl) counterEl.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
            
        } catch (err) {
            console.error('Error loading simulation:', err);
            this.showTemporaryMessage('Failed to load simulation. Using regular question instead.');
            
            // Restore MCQ elements
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) optionsContainer.style.display = 'grid';
            
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) submitBtn.style.display = 'block';
            
            const hintBtn = document.querySelector('.hint-btn');
            if (hintBtn) hintBtn.style.display = 'block';
            
            // Fall back to regular MCQ
            this.loadRegularQuestion(question);
        } finally {
            this.hideLoading();
        }
    },
    
    loadRegularQuestion(question) {
        // Your existing question loading logic for MCQs
        this.renderOptions(question);
        
        // Update counter
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) counterEl.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
        
        // Set question text
        const questionTextEl = document.querySelector('.question-text');
        if (questionTextEl) questionTextEl.textContent = question.text;
        
        // Enable submit button
        if (this.submitBtn) this.submitBtn.disabled = true;
        if (this.hintBtn) this.hintBtn.disabled = false;
    },
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    setupSimulationControls(question) {
        // Remove any existing done button
        const existingBtn = document.getElementById('simulation-done-btn');
        if (existingBtn) existingBtn.remove();
        
        // Add "Done" button for simulations
        const footer = document.querySelector('.gameplay-footer');
        const self = this;
        
        const doneBtn = document.createElement('button');
        doneBtn.id = 'simulation-done-btn';
        doneBtn.className = 'submit-btn';
        doneBtn.textContent = '✅ Done Exploring';
        doneBtn.style.marginLeft = 'auto';
        doneBtn.style.marginRight = 'auto';
        doneBtn.style.display = 'block';
        doneBtn.style.width = '200px';
        
        doneBtn.onclick = () => {
            // Track that they viewed the simulation
            this.answers.push({
                questionId: question.id,
                type: 'simulation',
                mode: question.mode_sim,
                timeSpent: (Date.now() - this.questionStartTime) / 1000
            });
            
            // Move to next question
            this.loadQuestion(this.currentQuestionIndex + 1);
        };
        
        footer.appendChild(doneBtn);
    },
    
    showLoading(message) {
        let loader = document.getElementById('simulation-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'simulation-loader';
            loader.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 3000;
                text-align: center;
            `;
            document.body.appendChild(loader);
        }
        loader.innerHTML = `
            <div class="spinner" style="margin: 0 auto 20px; width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p>${message || 'Loading...'}</p>
        `;
    },
    
    hideLoading() {
        const loader = document.getElementById('simulation-loader');
        if (loader) loader.remove();
    }
};

// Make sure QuestScreen is globally available - THIS MUST BE AT THE END!
window.QuestScreen = QuestScreen;
console.log('✅ QuestScreen registered globally');