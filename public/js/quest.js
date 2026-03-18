// quest.js - Complete Fixed Version with Labeling Question Support
console.log('✅✅✅ QUEST.JS LOADING - FULL VERSION ✅✅✅');

const QuestScreen = {
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
    
    // Current labeling question reference
    currentLabelingQuestion: null,
    
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
        console.log('   Challenge:', challenge);
        
        // Check if template exists FIRST
        const template = document.getElementById('gameplay-view');
        if (!template) {
            console.error('❌ CRITICAL: gameplay-view template missing from HTML!');
            alert('System error: Game template missing. Please refresh.');
            return;
        }
        console.log('✅ Template found');
        
        // Store data
        this.questData = questData;
        this.challenge = challenge;
        this.questions = questData.questions || [];
        this.studySims = questData.studySims || [];
        this.currentQuestionIndex = 0;
        this.currentStudySimIndex = -1;
        this.isStudyMode = false;
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
        
        // Start with first content (could be study sim or question)
        this.loadNextContent();
        
        this.loadPsychologicalParams();
        
        // Initialize game mode
        if (questData.gameMode && questData.gameMode !== 'none') {
            if (window.GameModes) {
                console.log('🎮 Initializing game mode:', questData.gameMode);
                window.GameModes.init(
                    questData.gameMode,
                    questData.gameMode === 'timed' ? 30 : null,
                    () => this.handleTimeUp(),
                    questData.questId
                );
            }
        }
        
        // Show question decision info
        this.updateQuestionDecision(questData.metadata);
    },
    
    render() {
        console.log('🎨 Rendering gameplay view...');
        
        try {
            const template = document.getElementById('gameplay-view');
            if (!template) {
                console.error('❌ Template not found in render');
                return;
            }
            
            const templateContent = template.content.cloneNode(true);
            console.log('✅ Template cloned');
            
            const self = this;
            
            // Check all required elements
            const questNameEl = templateContent.querySelector('.current-quest-name');
            const counterEl = templateContent.querySelector('.question-counter');
            const backBtn = templateContent.querySelector('.back-btn');
            const hintBtn = templateContent.querySelector('.hint-btn');
            const submitBtn = templateContent.querySelector('.submit-btn');
            const timerDisplay = templateContent.querySelector('.timer-display');
            const hintDisplay = templateContent.querySelector('.hint-display');
            
            // Set quest info
            if (questNameEl) questNameEl.textContent = this.questData.name || 'Quest';
            if (counterEl) counterEl.textContent = `0/${this.questions.length}`;
            
            // Back button
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    if (confirm('Exit quest? Your progress will not be saved.')) {
                        self.exit();
                    }
                });
            }
            
            // Hint button
            if (hintBtn) {
                hintBtn.addEventListener('click', () => self.getHint());
            }
            
            // Submit button
            if (submitBtn) {
                submitBtn.addEventListener('click', () => self.submitAnswer());
            }
            
            // Update content area
            const contentArea = document.getElementById('content-area');
            if (!contentArea) {
                console.error('❌ Content area not found!');
                return;
            }
            
            contentArea.innerHTML = '';
            contentArea.appendChild(templateContent);
            console.log('✅ Template added to DOM');
            
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
            
        } catch (err) {
            console.error('❌ Error in render:', err);
            alert('Error rendering quest. Check console.');
        }
    },
    
    // Load next content (handles study sims vs questions)
   // In quest.js, update loadNextContent method

// In quest.js - update loadNextContent method

loadNextContent() {
    console.log('🔄 Loading next content...');
    console.log(`   Study sims left: ${this.studySims.length - this.currentStudySimIndex - 1}`);
    console.log(`   Questions left: ${this.questions.length - this.currentQuestionIndex}`);
    console.log(`   Current question index: ${this.currentQuestionIndex}`);
    
    // Check if there are study sims to show first
    if (this.currentStudySimIndex < this.studySims.length - 1) {
        this.currentStudySimIndex++;
        const studySim = this.studySims[this.currentStudySimIndex];
        console.log(`📚 Showing study sim ${this.currentStudySimIndex + 1}/${this.studySims.length}`);
        this.showStudySim(studySim);
        return;
    }
    
    // No more study sims, load regular question
    if (this.currentQuestionIndex < this.questions.length) {
        console.log(`📝 Loading question ${this.currentQuestionIndex + 1}/${this.questions.length}`);
        this.loadQuestion(this.currentQuestionIndex);
    } else {
        console.log('🏁 No more content, completing quest');
        this.completeQuest();
    }
},
    
    async showStudySim(studySim) {
        console.log('📚 Showing study simulation:', studySim);
        this.isStudyMode = true;
        
        // Hide standard MCQ elements
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.style.display = 'none';
        
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) submitBtn.style.display = 'none';
        
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';
        
        // Update UI for study mode
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) {
            counterEl.innerHTML = '📚 <span style="color: #9f7aea;">Study Guide</span>';
            counterEl.style.fontSize = '1.1em';
        }
        
        const difficultyEl = document.querySelector('.difficulty-badge');
        if (difficultyEl) {
            difficultyEl.textContent = '📖 Reference';
            difficultyEl.className = 'difficulty-badge study';
        }
        
        const questionText = document.querySelector('.question-text');
        if (questionText) {
            questionText.innerHTML = `<span style="color: #9f7aea;">📚 STUDY MODE:</span> ${studySim.title || 'Explore the model'}`;
        }
        
        // Create container for simulation
        const simContainer = document.createElement('div');
        simContainer.id = 'simulation-container';
        simContainer.style.width = '100%';
        simContainer.style.minHeight = '500px';
        simContainer.style.marginTop = '20px';
        
        const questionTextEl = document.querySelector('.question-text');
        if (questionTextEl) {
            questionTextEl.parentNode.insertBefore(simContainer, questionTextEl.nextSibling);
        }
        
        // Load simulation and wait for it to complete
        try {
            await this.loadStudySimulation(studySim, simContainer);
            console.log('✅ Simulation loaded successfully');
        } catch (err) {
            console.error('❌ Failed to load simulation:', err);
            simContainer.innerHTML = '<div style="color:red; padding:20px;">Failed to load study guide</div>';
        }
        
        // Add study message
        this.addStudyMessage();
        
        // Setup continue button after simulation is loaded
        this.setupStudyContinueButton(studySim);
    },
    
    async loadStudySimulation(studySim, container) {
        try {
            if (!window.SimulationLoader) {
                await this.loadScript('/js/simulation-loader.js');
                await SimulationLoader.init();
            }
            
            const simElement = await SimulationLoader.loadSimulation(studySim);
            container.appendChild(simElement);
            
        } catch (err) {
            console.error('Error loading study simulation:', err);
            container.innerHTML = '<div style="color:red; padding:20px;">Failed to load study guide</div>';
        }
    },
    
    addStudyMessage() {
        const questionArea = document.querySelector('.gameplay-area');
        if (!questionArea) return;
        
        const studyMessage = document.createElement('div');
        studyMessage.className = 'study-message';
        studyMessage.style.cssText = `
            background: linear-gradient(135deg, #9f7aea20 0%, #667eea20 100%);
            border-left: 4px solid #9f7aea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            color: #2d3748;
        `;
        studyMessage.innerHTML = `
            <strong>📚 Study Guide</strong>
            <p style="margin-top: 8px; color: #4a5568;">Take your time to explore the model. Click "Continue" when you're ready to practice.</p>
        `;
        questionArea.insertBefore(studyMessage, questionArea.firstChild);
    },
    
    setupStudyContinueButton(studySim) {
        console.log('🎯 Setting up continue button for study sim:', studySim);
        
        // Check if simulation container exists
        const simContainer = document.getElementById('simulation-container');
        console.log('Simulation container exists:', !!simContainer);
        
        if (!simContainer) {
            console.error('❌ No simulation container found!');
            return;
        }
        
        // Create a dedicated container for the continue button at the bottom
        const continueContainer = document.createElement('div');
        continueContainer.id = 'continue-container';
        continueContainer.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 30px;
            padding: 20px;
            border-top: 1px solid #e2e8f0;
        `;
        
        // Remove any existing button
        const existingBtn = document.getElementById('simulation-done-btn');
        if (existingBtn) {
            console.log('Removing existing button');
            existingBtn.remove();
        }
        
        // Remove any existing container
        const existingContainer = document.getElementById('continue-container');
        if (existingContainer) {
            console.log('Removing existing container');
            existingContainer.remove();
        }
        
        const continueBtn = document.createElement('button');
        continueBtn.id = 'simulation-done-btn';
        continueBtn.className = 'submit-btn';
        continueBtn.textContent = '📚 Continue to Questions';
        continueBtn.style.cssText = `
            margin: 0;
            width: 250px;
            display: block;
            background: #9f7aea;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(159, 122, 234, 0.3);
        `;
        
        continueBtn.onmouseover = () => continueBtn.style.transform = 'translateY(-2px)';
        continueBtn.onmouseout = () => continueBtn.style.transform = 'translateY(0)';
        
        const self = this;
        continueBtn.onclick = function() {
            console.log('🎯 Continue button clicked!');
            console.log('✅ Study complete, continuing to next content');
            
            // Track that they viewed the study sim
            self.answers.push({
                questionId: studySim.id,
                type: 'simulation',
                mode: 'study',
                timeSpent: (Date.now() - self.startTime) / 1000
            });
            
            // Reset UI for questions
            self.isStudyMode = false;
            
            // Hide study message
            const studyMessage = document.querySelector('.study-message');
            if (studyMessage) studyMessage.remove();
            
            // Remove simulation container
            const simContainer = document.getElementById('simulation-container');
            if (simContainer) simContainer.remove();
            
            // Remove continue container
            if (continueContainer) continueContainer.remove();
            
            // Show MCQ elements again
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) optionsContainer.style.display = 'grid';
            
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) submitBtn.style.display = 'block';
            
            const hintBtn = document.querySelector('.hint-btn');
            if (hintBtn) hintBtn.style.display = 'block';
            
            // Reset counter display
            const counterEl = document.querySelector('.question-counter');
            if (counterEl) {
                counterEl.textContent = `${self.currentQuestionIndex + 1}/${self.questions.length}`;
                counterEl.style.fontSize = '';
            }
            
            // Load next content (which will be a question)
            self.loadNextContent();
        };
        
        continueContainer.appendChild(continueBtn);
        
        // Add the container after the simulation container
        console.log('Adding continue container after simulation');
        simContainer.parentNode.insertBefore(continueContainer, simContainer.nextSibling);
        
        console.log('✅ Continue button setup complete');
    },
    
   // In quest.js - update loadSimulationQuestion method

async loadSimulationQuestion(question) {
    console.log('🎮 Loading simulation question:', question);
    
    // Determine mode - check multiple possible sources
    const mode = question.mode_sim || question.Mode_Sim || question.mode || 'labeling';
    const isStudySim = question.isStudySim || false;
    
    console.log(`   Mode detected: ${mode}, isStudySim: ${isStudySim}`);
    
    this.showLoading('Loading 3D simulation...');
    
    try {
        if (!window.SimulationLoader) {
            await this.loadScript('/js/simulation-loader.js');
            await SimulationLoader.init();
        }
        
        // Hide standard MCQ elements
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.style.display = 'none';
        
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';
        
        // Update counter
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) {
            counterEl.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
        }
        
        // Create container for simulation
        const simContainer = document.createElement('div');
        simContainer.id = 'simulation-container';
        simContainer.style.width = '100%';
        simContainer.style.minHeight = '500px';
        simContainer.style.marginTop = '20px';
        
        const questionText = document.querySelector('.question-text');
        if (questionText) {
            questionText.parentNode.insertBefore(simContainer, questionText.nextSibling);
        }
        
        // Load simulation
        const simElement = await SimulationLoader.loadSimulation({
            ...question,
            mode_sim: mode  // Pass the mode explicitly
        });
        simContainer.appendChild(simElement);
        
        // Handle based on mode
        if (mode === 'study' || isStudySim) {
            // STUDY MODE - Learning aid with continue button
            console.log('📚 This is a STUDY mode simulation');
            this.setupStudySimControls(question);
        } else {
            // LABELING MODE - Question with submit button
            console.log('🔍 This is a LABELING mode question');
            this.setupLabelingSim(question);
        }
        
    } catch (err) {
        console.error('Error loading simulation:', err);
        this.showTemporaryMessage('Failed to load simulation. Using regular question instead.');
        this.fallbackToRegularQuestion(question);
    } finally {
        this.hideLoading();
    }
},

setupLabelingSim(question) {
    console.log('🏷️ Setting up LABELING mode simulation (acts as question)');
    
    // Remove any existing study button
    const existingBtn = document.getElementById('simulation-done-btn');
    if (existingBtn) existingBtn.remove();
    
    // Hide hint button for labeling questions
    const hintBtn = document.querySelector('.hint-btn');
    if (hintBtn) hintBtn.style.display = 'none';
    
    // SHOW SUBMIT BUTTON for labeling questions
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.disabled = true; // Disabled until all hotspots are labeled
        submitBtn.textContent = '✅ Submit Answers';
        submitBtn.style.background = '#48bb78';
    }
    
    // Add a message that this is a labeling question
    const questionArea = document.querySelector('.gameplay-area');
    if (questionArea) {
        // Remove any existing message
        const oldMsg = document.querySelector('.labeling-message');
        if (oldMsg) oldMsg.remove();
        
        const message = document.createElement('div');
        message.className = 'labeling-message';
        message.style.cssText = `
            background: linear-gradient(135deg, #48bb7820 0%, #38a16920 100%);
            border-left: 4px solid #48bb78;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            color: #2d3748;
        `;
        message.innerHTML = `
            <strong>🔍 Labeling Question</strong>
            <p style="margin-top: 8px; color: #4a5568;">Label all parts correctly. Click "Submit Answers" when done.</p>
        `;
        questionArea.insertBefore(message, questionArea.firstChild);
    }
    
    // Store question reference for submit handler
    this.currentLabelingQuestion = question;
    
    // Setup the submit button handler for labeling
    this.setupLabelingSubmitHandler(question);
    this.setupLabelingSubmitListener(question);   
},

// In quest.js - replace the setupStudySimControls method

// In quest.js - replace the setupStudySimControls method with this full block

// In quest.js - replace the entire setupStudySimControls method with this

// In quest.js - replace the entire setupStudySimControls method with this

// In quest.js - replace the entire setupStudySimControls method with this

// In quest.js - replace setupStudySimControls with this final version

setupStudySimControls(question) {
    console.log('📚 Setting up STUDY / RECAP mode simulation');

    // Step 1: Hide standard buttons
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) submitBtn.style.display = 'none';

    const hintBtn = document.querySelector('.hint-btn');
    if (hintBtn) hintBtn.style.display = 'none';

    // Step 2: Update UI for study mode
    const counterEl = document.querySelector('.question-counter');
    if (counterEl) {
        counterEl.innerHTML = '📚 <span style="color: #9f7aea;">Study Guide</span>';
    }

    const difficultyEl = document.querySelector('.difficulty-badge');
    if (difficultyEl) {
        difficultyEl.textContent = '📖 Reference';
        difficultyEl.className = 'difficulty-badge study';
    }

    const questionText = document.querySelector('.question-text');
    if (questionText) {
        questionText.innerHTML = `<span style="color: #9f7aea;">📚 STUDY MODE:</span> ${question.text || 'Explore the model'}`;
    }

    // Step 3: Add study message
    this.addStudyMessage();

    // Step 4: Remove any existing bottom controls
    const existingContainer = document.getElementById('study-controls-container');
    if (existingContainer) existingContainer.remove();

    // Step 5: Create fixed bottom container
    const bottomContainer = document.createElement('div');
    bottomContainer.id = 'study-controls-container';
    
    // Step 6: Create continue button
    const continueBtn = document.createElement('button');
    continueBtn.id = 'simulation-done-btn';
    continueBtn.textContent = '📚 Continue to Questions';

    // Step 7: Add click handler
    continueBtn.onclick = () => {
        console.log('✅ CONTINUE BUTTON CLICKED!');
        
        // Track view
        this.answers.push({
            questionId: question.id,
            type: 'simulation',
            mode: 'study',
            timeSpent: (Date.now() - (this.questionStartTime || this.startTime)) / 1000
        });

        // Remove bottom container
        bottomContainer.remove();

        // Clean up study mode
        this.cleanupStudyMode();

        // Show regular buttons again
        if (submitBtn) submitBtn.style.display = 'block';
        if (hintBtn) hintBtn.style.display = 'block';

        // Load next content
        this.loadNextContent();
    };

    bottomContainer.appendChild(continueBtn);
    document.body.appendChild(bottomContainer);

    console.log('✅ Study mode controls setup complete');
},

// Add this method to quest.js
// Update your cleanupStudyMode method to ensure it removes the bottom container
cleanupStudyMode() {
    console.log('🧹 Cleaning up study mode UI');

    // Remove fixed bottom container
    const bottomContainer = document.getElementById('study-controls-container');
    if (bottomContainer) bottomContainer.remove();

    // Remove study message
    const studyMessage = document.querySelector('.study-message');
    if (studyMessage) studyMessage.remove();

    // Remove simulation container
    const simContainer = document.getElementById('simulation-container');
    if (simContainer) simContainer.remove();

    // Reset UI elements
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.style.display = 'grid';
        optionsContainer.innerHTML = '';
    }

    // Reset counter
    const counterEl = document.querySelector('.question-counter');
    if (counterEl) {
        counterEl.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
        counterEl.style.fontSize = '';
    }

    // Reset difficulty badge
    const difficultyEl = document.querySelector('.difficulty-badge');
    if (difficultyEl) {
        difficultyEl.textContent = '';
        difficultyEl.className = 'difficulty-badge';
    }

    // Reset question text
    const questionText = document.querySelector('.question-text');
    if (questionText) questionText.innerHTML = '';

    console.log('✅ Study mode cleaned up');
},
/*
// Add this new method to quest.js
cleanupStudyMode() {
    console.log('🧹 Cleaning up study mode UI');
    
    // Remove study message
    const studyMessage = document.querySelector('.study-message');
    if (studyMessage) studyMessage.remove();
    
    // Remove simulation container
    const simContainer = document.getElementById('simulation-container');
    if (simContainer) simContainer.remove();
    
    // Show and reset MCQ elements
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.style.display = 'grid';
        optionsContainer.innerHTML = ''; // Clear any old options
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.textContent = '✅ Submit Answer';
        submitBtn.style.background = '#48bb78';
    }
    
    const hintBtn = document.querySelector('.hint-btn');
    if (hintBtn) {
        hintBtn.style.display = 'block';
        hintBtn.disabled = false;
    }
    
    // Reset counter display
    const counterEl = document.querySelector('.question-counter');
    if (counterEl) {
        counterEl.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
        counterEl.style.fontSize = '';
    }
    
    // Reset difficulty badge
    const difficultyEl = document.querySelector('.difficulty-badge');
    if (difficultyEl) {
        difficultyEl.textContent = '';
        difficultyEl.className = 'difficulty-badge';
    }
    
    // Reset question text
    const questionText = document.querySelector('.question-text');
    if (questionText) {
        questionText.innerHTML = '';
    }
    
    // Clear any lingering state
    this.selectedOption = null;
    this.answerSubmitted = false;
    this.hintUsed = false;
    
    console.log('✅ Study mode cleaned up, ready for questions');
},
*/
addStudyMessage() {
    const questionArea = document.querySelector('.gameplay-area');
    if (!questionArea) return;
    
    const studyMessage = document.createElement('div');
    studyMessage.className = 'study-message';
    studyMessage.style.cssText = `
        background: linear-gradient(135deg, #9f7aea20 0%, #667eea20 100%);
        border-left: 4px solid #9f7aea;
        padding: 15px;
        margin: 20px 0;
        border-radius: 8px;
        color: #2d3748;
    `;
    studyMessage.innerHTML = `
        <strong>📚 Study Guide</strong>
        <p style="margin-top: 8px; color: #4a5568;">Take your time to explore the model. Click "Continue" when you're ready to practice.</p>
    `;
    questionArea.insertBefore(studyMessage, questionArea.firstChild);
},

setupLabelingSubmitHandler(question) {
    const submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;
    
    // Remove any existing handler
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    this.submitBtn = newSubmitBtn;
    
    const self = this;
    newSubmitBtn.onclick = function() {
        console.log('📤 Submitting labeling answers');
        
        // Get the results from the simulation engine
        const result = window.SimulationLoader?.getLabelingResult();
        
        if (!result) {
            alert('Please complete the labeling first');
            return;
        }
        
        // Record the answer
        self.answers.push({
            questionId: question.id,
            type: 'simulation',
            mode: 'labeling',
            isCorrect: result.isCorrect,
            correctCount: result.correct,
            totalCount: result.total,
            pointsEarned: result.pointsEarned,
            timeSpent: (Date.now() - self.questionStartTime) / 1000
        });
        
        // Update points
        const pointsSpan = document.querySelector('.points-earned');
        if (pointsSpan) {
            const currentPoints = parseInt(pointsSpan.textContent.split(' ')[1]) || 0;
            pointsSpan.textContent = `⭐ ${currentPoints + result.pointsEarned}`;
        }
        
        // Update accuracy
        const correctSoFar = self.answers.filter(a => a.isCorrect).length;
        self.params.accuracy = (correctSoFar / self.answers.length) * 100;
        self.updateParameterDisplays();
        
        // Show feedback modal
        self.showLabelingFeedback(result);
    };
},

showLabelingFeedback(result) {
    const feedbackModal = document.createElement('div');
    feedbackModal.className = 'feedback-card-detailed';
    
    const isCorrect = result.isCorrect;
    const pointsEarned = result.pointsEarned;
    
    feedbackModal.innerHTML = `
        <div class="feedback-header">
            <span class="feedback-icon-large">${isCorrect ? '🎉' : '💪'}</span>
            <span class="feedback-title ${isCorrect ? 'correct' : 'incorrect'}">
                ${isCorrect ? 'Correct!' : 'Not quite right'}
            </span>
        </div>
        
        <div class="feedback-comparison">
            <div class="comparison-row">
                <span class="comparison-label">Results:</span>
                <span>${result.correct}/${result.total} correct</span>
            </div>
            <div class="comparison-row">
                <span class="comparison-label">Points earned:</span>
                <span class="${isCorrect ? 'correct-answer' : ''}">⭐ ${pointsEarned}</span>
            </div>
        </div>
        
        <div class="detailed-solution">
            <h4>📚 ${isCorrect ? 'Great job!' : 'Keep practicing!'}</h4>
            <p>${isCorrect ? 'You correctly identified all parts!' : 'You got some wrong. Try again next time!'}</p>
        </div>
        
        <div class="feedback-actions">
            <button class="feedback-btn primary" id="continue-feedback-btn">Continue</button>
        </div>
    `;
    
    document.body.appendChild(feedbackModal);
    
    const self = this;
    document.getElementById('continue-feedback-btn').addEventListener('click', function() {
        feedbackModal.remove();
        
        // Clean up simulation UI
        self.cleanupSimulationUI();
        
        // Increment question index and load next
        self.currentQuestionIndex++;
        self.loadNextContent();
    });
},

cleanupSimulationUI() {
    // Remove labeling message
    const msg = document.querySelector('.labeling-message');
    if (msg) msg.remove();
    
    // Remove study message
    const studyMsg = document.querySelector('.study-message');
    if (studyMsg) studyMsg.remove();
    
    // Remove simulation container
    const simContainer = document.getElementById('simulation-container');
    if (simContainer) simContainer.remove();
    
    // Restore MCQ elements
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) optionsContainer.style.display = 'grid';
    
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.textContent = '✅ Submit Answer';
        submitBtn.disabled = true;
    }
    
    const hintBtn = document.querySelector('.hint-btn');
    if (hintBtn) hintBtn.style.display = 'block';
    
    // Reset counter display
    const counterEl = document.querySelector('.question-counter');
    if (counterEl) {
        counterEl.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
        counterEl.style.fontSize = '';
    }
    
    // Clear labeling progress
    if (window.SimulationLoader) {
        window.SimulationLoader.clearLabelingProgress();
    }
},
   /* 
    setupLabelingSim(question) {
        console.log('🏷️ Setting up LABELING mode simulation (acts as question)');
        
        // Remove any existing study button
        const existingBtn = document.getElementById('simulation-done-btn');
        if (existingBtn) existingBtn.remove();
        
        // Hide hint button for labeling questions
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';
        
        // SHOW SUBMIT BUTTON for labeling questions
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.disabled = true; // Disabled until all hotspots are labeled
            submitBtn.textContent = '✅ Submit Answers';
        }
        
        // Add a message that this is a labeling question
        const questionArea = document.querySelector('.gameplay-area');
        if (questionArea) {
            // Remove any existing message
            const oldMsg = document.querySelector('.labeling-message');
            if (oldMsg) oldMsg.remove();
            
            const message = document.createElement('div');
            message.className = 'labeling-message';
            message.style.cssText = `
                background: linear-gradient(135deg, #48bb7820 0%, #38a16920 100%);
                border-left: 4px solid #48bb78;
                padding: 15px;
                margin: 20px 0;
                border-radius: 8px;
                color: #2d3748;
            `;
            message.innerHTML = `
                <strong>🔍 Labeling Question</strong>
                <p style="margin-top: 8px; color: #4a5568;">Label all parts correctly. Click "Submit Answers" when done.</p>
            `;
            questionArea.insertBefore(message, questionArea.firstChild);
        }
        
        // Store question reference for submit handler
        this.currentLabelingQuestion = question;
        
        // Setup the submit button handler for labeling
        this.setupLabelingSubmitHandler(question);
    },
  */  
    setupLabelingSubmitHandler(question) {
        const submitBtn = document.querySelector('.submit-btn');
        if (!submitBtn) return;
        
        // Remove any existing handler
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
        this.submitBtn = newSubmitBtn;
        
        const self = this;
        newSubmitBtn.onclick = function() {
            console.log('📤 Submitting labeling answers');
            
            // Get the results from the simulation engine
            const result = window.SimulationLoader?.getLabelingResult();
            
            if (!result) {
                alert('Please complete the labeling first');
                return;
            }
            
            // Record the answer
            self.answers.push({
                questionId: question.id,
                type: 'simulation',
                mode: 'labeling',
                isCorrect: result.isCorrect,
                correctCount: result.correct,
                totalCount: result.total,
                pointsEarned: result.pointsEarned,
                timeSpent: (Date.now() - self.questionStartTime) / 1000
            });
            
            // Update points
            const pointsSpan = document.querySelector('.points-earned');
            if (pointsSpan) {
                const currentPoints = parseInt(pointsSpan.textContent.split(' ')[1]) || 0;
                pointsSpan.textContent = `⭐ ${currentPoints + result.pointsEarned}`;
            }
            
            // Update accuracy
            const correctSoFar = self.answers.filter(a => a.isCorrect).length;
            self.params.accuracy = (correctSoFar / self.answers.length) * 100;
            self.updateParameterDisplays();
            
            // Show feedback modal
            self.showLabelingFeedback(result);
        };
    },
    
    showLabelingFeedback(result) {
        const feedbackModal = document.createElement('div');
        feedbackModal.className = 'feedback-card-detailed';
        
        const isCorrect = result.isCorrect;
        const pointsEarned = result.pointsEarned;
        
        feedbackModal.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-icon-large">${isCorrect ? '🎉' : '💪'}</span>
                <span class="feedback-title ${isCorrect ? 'correct' : 'incorrect'}">
                    ${isCorrect ? 'Correct!' : 'Not quite right'}
                </span>
            </div>
            
            <div class="feedback-comparison">
                <div class="comparison-row">
                    <span class="comparison-label">Results:</span>
                    <span>${result.correct}/${result.total} correct</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Points earned:</span>
                    <span class="${isCorrect ? 'correct-answer' : ''}">⭐ ${pointsEarned}</span>
                </div>
            </div>
            
            <div class="detailed-solution">
                <h4>📚 ${isCorrect ? 'Great job!' : 'Keep practicing!'}</h4>
                <p>${isCorrect ? 'You correctly identified all parts!' : 'You got some wrong. Try again next time!'}</p>
            </div>
            
            <div class="feedback-actions">
                <button class="feedback-btn primary" id="continue-feedback-btn">Continue</button>
            </div>
        `;
        
        document.body.appendChild(feedbackModal);
        
        const self = this;
        document.getElementById('continue-feedback-btn').addEventListener('click', function() {
            feedbackModal.remove();
            
            // Remove labeling message and simulation container
            const msg = document.querySelector('.labeling-message');
            if (msg) msg.remove();
            
            const simContainer = document.getElementById('simulation-container');
            if (simContainer) simContainer.remove();
            
            // Restore MCQ elements
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) optionsContainer.style.display = 'grid';
            
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) submitBtn.style.display = 'block';
            
            const hintBtn = document.querySelector('.hint-btn');
            if (hintBtn) hintBtn.style.display = 'block';
            
            // Reset submit button text
            if (submitBtn) submitBtn.textContent = '✅ Submit Answer';
            
            // Clear labeling progress
            if (window.SimulationLoader) {
                window.SimulationLoader.clearLabelingProgress();
            }
            
            // Increment question index and load next
            self.currentQuestionIndex++;
            self.loadNextContent();
        });
    },
    
    // In quest.js, ensure loadQuestion properly sets up the UI

loadQuestion(index) {
    console.log(`📝 loadQuestion called with index: ${index}`);
    
    if (index >= this.questions.length) {
        console.log('   End of quest, completing...');
        this.completeQuest();
        return;
    }
    
    // Set the new index
    this.currentQuestionIndex = index;
    const question = this.questions[index];
    
    console.log(`   Loading question ${index + 1}:`, {
        id: question.id,
        Q_ID: question.Q_ID,
        text: question.text?.substring(0, 50)
    });
    
    // Make sure MCQ elements are visible
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.style.display = 'grid';
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.textContent = '✅ Submit Answer';
    }
    
    const hintBtn = document.querySelector('.hint-btn');
    if (hintBtn) {
        hintBtn.style.display = 'block';
        hintBtn.disabled = false;
    }
    
    // Check if simulation
    if (question.question_type === 'SIM') {
        this.loadSimulationQuestion(question);
        return;
    }
    
    // Clear hesitation timer
    if (this.hesitationTimer) {
        clearInterval(this.hesitationTimer);
    }
    
    // Reset state
    this.selectedOption = null;
    this.answerSubmitted = false;
    this.hintUsed = false;
    this.hintDisplayed = false;
    this.answerChanged = false;
    this.changeCount = 0;
    
    // Update UI
    const counterEl = document.querySelector('.question-counter');
    if (counterEl) counterEl.textContent = `${index + 1}/${this.questions.length}`;
    
    const questionTextEl = document.querySelector('.question-text');
    if (questionTextEl) questionTextEl.textContent = question.text || 'Question text missing';
    
    const topicBadgeEl = document.querySelector('.topic-badge');
    if (topicBadgeEl) topicBadgeEl.textContent = this.challenge?.name || 'Topic';
    
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
    
    // Reset timer
    this.questionStartTime = Date.now();
    this.startHesitationTracking();
},
    
    renderOptions(question) {
        const optionsContainer = document.getElementById('options-container');
        if (!optionsContainer) {
            console.error('❌ options-container not found');
            return;
        }
        
        optionsContainer.innerHTML = '';
        const self = this;
        
        const letters = ['A', 'B', 'C', 'D'];
        letters.forEach(letter => {
            const optionText = question.options?.[letter];
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
        
        if (this.selectedOption && this.selectedOption !== letter) {
            this.answerChanged = true;
            this.changeCount++;
            console.log(`🔄 Answer changed! (${this.changeCount} changes)`);
        }
        
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.letter === letter) {
                opt.classList.add('selected');
            }
        });
        
        this.selectedOption = letter;
        if (this.submitBtn) this.submitBtn.disabled = false;
        
        const responseTime = (Date.now() - this.questionStartTime) / 1000;
        if (responseTime < 3) {
            this.params.confidence = Math.min(100, this.params.confidence + 1);
            this.updateParameterDisplays();
        }
    },
    
    async submitAnswer() {
        if (!this.selectedOption || this.answerSubmitted) return;
        
        console.log(`📤 Submitting answer: ${this.selectedOption}`);
        
        if (this.hesitationTimer) {
            clearInterval(this.hesitationTimer);
        }
        
        this.answerSubmitted = true;
        if (this.submitBtn) this.submitBtn.disabled = true;
        if (this.hintBtn) this.hintBtn.disabled = true;
        
        document.querySelectorAll('.option').forEach(opt => {
            opt.style.pointerEvents = 'none';
        });
        
        const responseTime = (Date.now() - this.questionStartTime) / 1000;
        const question = this.questions[this.currentQuestionIndex];
        const correctAnswer = this.extractCorrectLetter(question.correctAnswer);
        const isCorrect = this.selectedOption === correctAnswer;
        
        console.log(`✅ Correct: ${correctAnswer}, User was ${isCorrect ? 'right' : 'wrong'}`);
        
        if (!isCorrect) {
            this.params.frustration = Math.min(100, this.params.frustration + 15);
            this.params.confidence = Math.max(0, this.params.confidence - 10);
        } else {
            this.params.frustration = Math.max(0, this.params.frustration - 5);
            this.params.confidence = Math.min(100, this.params.confidence + 5);
        }
        
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.dataset.letter === correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.dataset.letter === this.selectedOption && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });
        
        this.updateParameterDisplays();
        await this.showDetailedFeedback(this.selectedOption, correctAnswer, isCorrect, question, responseTime);
    },
    
    // In quest.js - update showDetailedFeedback method
async showDetailedFeedback(selected, correct, isCorrect, question, responseTime) {
    const feedbackModal = document.createElement('div');
    feedbackModal.className = 'feedback-card-detailed';
    const self = this;
    
    let detailedSolution = "Loading explanation...";
    
    try {
        // Use the correct question ID (could be Q_ID or id)
        const questionId = question.Q_ID || question.id;
        console.log(`📝 Fetching solution for question ID: ${questionId}`);
        
        const response = await fetch(`/api/solution/${questionId}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Solution received:', data);
            detailedSolution = data.detailedSolution || "No detailed solution available.";
        } else {
            // Generate a simple explanation
            detailedSolution = `The correct answer is ${correct}. ` +
                             (isCorrect ? "Great job! You got it right!" : 
                              "Review this topic to strengthen your understanding.");
        }
    } catch (err) {
        console.error('Error loading detailed solution:', err);
        detailedSolution = `The correct answer is ${correct}. ` +
                          (isCorrect ? "Well done! Keep up the good work!" : 
                           "Keep practicing! You'll get it next time.");
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
    
    document.getElementById('continue-feedback-btn').addEventListener('click', () => {
        feedbackModal.remove();
        this.currentQuestionIndex++;
        this.loadNextContent();
    });
    
    // Rest of your code (answers.push, points update, etc.) remains the same
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
    
    // Update points
    const pointsSpan = document.querySelector('.points-earned');
    if (pointsSpan) {
        const pointsEarned = isCorrect ? (this.hintUsed ? 2 : 3) : 0;
        const currentPoints = parseInt(pointsSpan.textContent.split(' ')[1]) || 0;
        pointsSpan.textContent = `⭐ ${currentPoints + pointsEarned}`;
    }
    
    // Update accuracy
    const correctSoFar = this.answers.filter(a => a.isCorrect).length;
    this.params.accuracy = (correctSoFar / this.answers.length) * 100;
    
    const hintsUsed = this.answers.filter(a => a.hintUsed).length;
    this.params.hintUsage = (hintsUsed / this.answers.length) * 100;
    
    this.params.mastery = Math.min(100, 
        this.params.accuracy - (hintsUsed / this.answers.length) * 15
    );
    
    this.updateParameterDisplays();
    
    if (window.GameModes) window.GameModes.questionAnswered();
},
    
    getOptionText(question, letter) {
        return question.options?.[letter] || '';
    },
    
    // In quest.js - update getHint method
async getHint() {
    if (this.hintUsed || this.answerSubmitted) return;
    
    const question = this.questions[this.currentQuestionIndex];
    console.log(`💡 Getting hint for question: ${question.id}`);
    
    try {
        // Use the correct question ID (could be Q_ID or id)
        const questionId = question.Q_ID || question.id;
        console.log(`   Using question ID: ${questionId}`);
        
        const response = await fetch(`/api/hint/${questionId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Hint received:', data);
        
        if (this.hintDisplay) {
            this.hintDisplay.textContent = data.hint || "Think carefully about what you've learned!";
            this.hintDisplay.style.display = 'block';
        }
        
        this.hintUsed = true;
        if (this.hintBtn) this.hintBtn.disabled = true;
        
        this.params.confidence = Math.max(0, this.params.confidence - 5);
        this.params.hintUsage = ((this.answers.filter(a => a.hintUsed).length + 1) / (this.answers.length + 1)) * 100;
        this.updateParameterDisplays();
        
    } catch (err) {
        console.error('❌ Error getting hint:', err);
        
        // Fallback hint
        if (this.hintDisplay) {
            this.hintDisplay.textContent = "Try to eliminate wrong answers first. Think about the key concepts!";
            this.hintDisplay.style.display = 'block';
        }
        
        this.hintUsed = true;
        if (this.hintBtn) this.hintBtn.disabled = true;
    }
},
    
    updateParameterDisplays() {
        const accuracyEl = document.getElementById('param-accuracy');
        if (accuracyEl) accuracyEl.textContent = Math.round(this.params.accuracy) + '%';
        
        const masteryEl = document.getElementById('param-mastery');
        if (masteryEl) masteryEl.textContent = Math.round(this.params.mastery) + '%';
        
        let masteryLevel = 'learning';
        if (this.params.mastery >= 80) masteryLevel = 'mastered';
        else if (this.params.mastery >= 60) masteryLevel = 'progressing';
        else if (this.params.mastery < 40) masteryLevel = 'struggling';
        
        const masteryLevelEl = document.getElementById('mastery-level');
        if (masteryLevelEl) masteryLevelEl.textContent = masteryLevel;
        
        const confidenceEl = document.getElementById('param-confidence');
        if (confidenceEl) confidenceEl.textContent = Math.round(this.params.confidence) + '%';
        
        const confidenceBar = document.getElementById('confidence-bar');
        if (confidenceBar) confidenceBar.style.width = this.params.confidence + '%';
        
        const frustrationEl = document.getElementById('param-frustration');
        if (frustrationEl) frustrationEl.textContent = Math.round(this.params.frustration) + '%';
        
        const frustrationBar = document.getElementById('frustration-bar');
        if (frustrationBar) frustrationBar.style.width = this.params.frustration + '%';
        
        const hintsEl = document.getElementById('param-hints');
        if (hintsEl) hintsEl.textContent = Math.round(this.params.hintUsage) + '%';
        
        const hintCount = this.answers.filter(a => a.hintUsed).length;
        const hintCountEl = document.getElementById('hint-count');
        if (hintCountEl) hintCountEl.textContent = `${hintCount} used`;
        
        const hesitationEl = document.getElementById('param-hesitation');
        if (hesitationEl) {
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
            
            if (metadata.factors?.length) {
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
        
        console.log('⏰ TIME\'S UP! Quest ending...');
        this.showTimeUpNotification();
        
        // Mark remaining questions as wrong
        for (let i = this.currentQuestionIndex; i < this.questions.length; i++) {
            const question = this.questions[i];
            this.answers.push({
                questionId: question.id,
                selectedAnswer: null,
                correctAnswer: this.extractCorrectLetter(question.correctAnswer),
                isCorrect: false,
                timeSpent: 0,
                hintUsed: false,
                answerChanged: false,
                changeCount: 0,
                hesitationCount: 0,
                timedOut: true
            });
        }
        
        setTimeout(() => {
            this.completeQuest();
        }, 2000);
    },
    
    showTimeUpNotification() {
        const existing = document.querySelector('.time-up-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'time-up-notification';
        notification.innerHTML = `
            <div class="time-up-content">
                <span class="time-icon">⏰</span>
                <div class="time-message">TIME'S UP!</div>
                <div class="time-details">${this.answers.filter(a => a.isCorrect).length}/${this.questions.length} correct</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    },
    
    async completeQuest() {
        console.log('🏁 Completing quest...');
        
        const totalQuestions = this.questions.length;
        const correctAnswers = this.answers.filter(a => a.isCorrect).length;
        const timedOut = this.answers.filter(a => a.timedOut).length;
        const hintsUsed = this.answers.filter(a => a.hintUsed).length;
        
        let mastery = (correctAnswers / totalQuestions) * 100;
        mastery -= (hintsUsed / totalQuestions) * 15;
        mastery -= (timedOut / totalQuestions) * 25;
        
        if (this.questData?.gameMode === 'quickfire') mastery += 5;
        mastery = Math.min(100, Math.max(0, Math.round(mastery)));
        
        try {
            const response = await fetch('/api/quests/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: window.App?.currentUser || 'student-001',
                    challengeId: this.challenge.id,
                    questId: this.questData?.questId,
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
        const self = this;
        
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
    
    // Utility methods
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
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
        const self = this;
        
        if (this.hesitationTimer) {
            clearInterval(this.hesitationTimer);
        }
        
        this.hesitationTimer = setInterval(() => {
            const timeOnQuestion = (Date.now() - self.questionStartTime) / 1000;
            
            if (timeOnQuestion > 5 && !self.answerSubmitted && !self.selectedOption) {
                self.hesitationCount++;
                self.params.hesitationRate = (self.hesitationCount / (self.currentQuestionIndex + 1)) * 100;
                self.updateParameterDisplays();
                self.params.frustration = Math.min(100, self.params.frustration + 2);
                
                if (timeOnQuestion > 10 && timeOnQuestion % 5 === 0) {
                    self.showTemporaryMessage('Still thinking? Take your time!');
                }
            }
        }, 1000);
    },
    
    fallbackToRegularQuestion(question) {
        // Restore MCQ elements
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.style.display = 'grid';
        
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) submitBtn.style.display = 'block';
        
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) hintBtn.style.display = 'block';
        
        this.renderOptions(question);
    },
    setupLabelingSubmitListener(question) {
    // Clean up any old listener
    window.onSimulationSubmit = null;

    window.onSimulationSubmit = (result) => {
        console.log('QuestScreen received simulation result:', result);

        // Record answer like normal MCQ
        this.answers.push({
            questionId: question.id,
            type: 'simulation',
            mode: 'labeling',
            isCorrect: result.isCorrect,
            correctCount: result.correctCount,
            totalCount: result.total,
            timeSpent: (Date.now() - this.questionStartTime) / 1000
        });

        // Update psychological params (example)
        if (result.isCorrect) {
            this.params.frustration = Math.max(0, this.params.frustration - 10);
            this.params.confidence = Math.min(100, this.params.confidence + 10);
        } else {
            this.params.frustration = Math.min(100, this.params.frustration + 15);
            this.params.confidence = Math.max(0, this.params.confidence - 10);
        }
        this.updateParameterDisplays();

        // Optional: show quick toast / modal (you already have showLabelingFeedback)
        this.showLabelingFeedback(result);

        // Auto-advance after short delay (so user sees feedback)
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.loadNextContent();
        }, 1800);  // 1.8 seconds — adjust as needed
    };

    console.log('✅ Submit listener attached for labeling question');
}
};

window.QuestScreen = QuestScreen;
console.log('✅ QuestScreen registered globally');