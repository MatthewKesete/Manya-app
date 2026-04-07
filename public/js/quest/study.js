// quest/study.js - Study Mode Handling
const QuestStudy = {
    async showStudySim(studySim, context) {
        console.log('📚 Showing study simulation - this is a RECAP in the middle of questions');
        context.isStudyMode = true;
        
        // Hide MCQ elements
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) {
            optionsContainer.style.display = 'none';
        }
        
        // Hide submit and hint buttons
        const submitBtn = document.querySelector('.submit-btn');
        const hintBtn = document.querySelector('.hint-btn');
        if (submitBtn) submitBtn.style.display = 'none';
        if (hintBtn) hintBtn.style.display = 'none';
        
        // Update header to show study mode
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) {
            counterEl.innerHTML = '📚 <span style="color: #9f7aea;">Study Guide</span>';
        }
        
        const questionText = document.querySelector('.question-text');
        if (questionText) {
            questionText.innerHTML = `<span style="color: #9f7aea;">📚 STUDY MODE:</span> ${studySim.title || 'Review this topic before continuing'}`;
        }
        
        // Remove any existing simulation container
        const existingSim = document.getElementById('simulation-container');
        if (existingSim) existingSim.remove();
        
        // Create simulation container
        const simContainer = document.createElement('div');
        simContainer.id = 'simulation-container';
        simContainer.style.cssText = 'width:100%; min-height:500px; margin:20px 0;';
        
        const questionTextEl = document.querySelector('.question-text');
        if (questionTextEl) {
            questionTextEl.parentNode.insertBefore(simContainer, questionTextEl.nextSibling);
        }
        
        try {
            if (!window.SimulationLoader) {
                await this.loadScript('/js/simulation-loader.js');
                await SimulationLoader.init();
            }
            const simElement = await SimulationLoader.loadSimulation(studySim);
            simContainer.appendChild(simElement);
        } catch (err) {
            simContainer.innerHTML = '<div style="color:red; padding:20px;">Failed to load study guide</div>';
        }
        
        // Add study message
        this.addStudyMessage();
        
        // Setup continue button - CRITICAL: must be called after simulation loads
        this.setupStudyContinueButton(studySim, context);
    },

    addStudyMessage() {
        const questionArea = document.querySelector('.gameplay-area');
        if (!questionArea) return;
        
        // Remove existing study message
        const existing = document.querySelector('.study-message');
        if (existing) existing.remove();
        
        const studyMessage = document.createElement('div');
        studyMessage.className = 'study-message';
        studyMessage.style.cssText = 'background:#9f7aea20; border-left:4px solid #9f7aea; padding:15px; margin:20px 0; border-radius:8px;';
        studyMessage.innerHTML = '<strong>📚 Study Guide</strong><p style="margin-top:8px;">Review this material. Click "Continue to Questions" when ready.</p>';
        questionArea.insertBefore(studyMessage, questionArea.firstChild);
    },

    setupStudyContinueButton(studySim, context) {
        console.log('🔘 Setting up Continue button for study recap');
        
        // Remove any existing continue button
        const existingBtn = document.getElementById('simulation-done-btn');
        if (existingBtn) existingBtn.remove();
        
        // Get the footer
        let footer = document.querySelector('.gameplay-footer');
        
        // If no footer exists, create one
        if (!footer) {
            console.log('Creating footer for continue button');
            footer = document.createElement('div');
            footer.className = 'gameplay-footer';
            footer.style.cssText = 'display: flex; justify-content: center; align-items: center; padding: 20px; margin-top: 20px; border-top: 1px solid #e2e8f0; background: white;';
            
            const gameplayArea = document.querySelector('.gameplay-area');
            if (gameplayArea) {
                gameplayArea.parentNode.insertBefore(footer, gameplayArea.nextSibling);
            } else {
                document.body.appendChild(footer);
            }
        }
        
        // Clear footer and create continue button
        footer.innerHTML = '';
        
        const continueBtn = document.createElement('button');
        continueBtn.id = 'simulation-done-btn';
        continueBtn.className = 'submit-btn';
        continueBtn.textContent = '📚 Continue to Questions';
        continueBtn.style.cssText = `
            margin: 10px auto;
            width: 280px;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 700;
            background: linear-gradient(135deg, #9f7aea, #805ad5);
            color: white;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            display: block;
            box-shadow: 0 4px 15px rgba(128, 90, 213, 0.3);
            transition: all 0.3s ease;
        `;
        
        continueBtn.onmouseover = () => {
            continueBtn.style.transform = 'translateY(-2px)';
            continueBtn.style.boxShadow = '0 8px 25px rgba(128, 90, 213, 0.4)';
        };
        continueBtn.onmouseout = () => {
            continueBtn.style.transform = 'translateY(0)';
            continueBtn.style.boxShadow = '0 4px 15px rgba(128, 90, 213, 0.3)';
        };
        
        continueBtn.onclick = () => {
            console.log('✅ Continue button clicked - resuming questions');
            
            // Track study sim view
            context.answers.push({ 
                questionId: studySim.id, 
                type: 'simulation', 
                mode: 'study', 
                timeSpent: (Date.now() - context.startTime) / 1000 
            });
            
            context.isStudyMode = false;
            
            // Remove study elements
            const studyMessage = document.querySelector('.study-message');
            if (studyMessage) studyMessage.remove();
            
            const simContainer = document.getElementById('simulation-container');
            if (simContainer) simContainer.remove();
            
            // Remove the continue button
            continueBtn.remove();
            
            // Find or recreate the submit and hint buttons
            let submitBtn = document.querySelector('.submit-btn:not(#simulation-done-btn)');
            let hintBtn = document.querySelector('.hint-btn');
            
            // If buttons don't exist, recreate them
            if (!submitBtn) {
                submitBtn = document.createElement('button');
                submitBtn.className = 'submit-btn';
                submitBtn.id = 'submitBtn';
                submitBtn.textContent = '✅ Submit Answer';
                submitBtn.disabled = true;
                submitBtn.style.cssText = 'padding: 12px 30px; background: #48bb78; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s; min-width: 150px;';
                submitBtn.onclick = () => context.submitAnswer();
            } else {
                submitBtn.style.display = 'block';
                submitBtn.disabled = true;
                submitBtn.textContent = '✅ Submit Answer';
            }
            
            if (!hintBtn) {
                hintBtn = document.createElement('button');
                hintBtn.className = 'hint-btn';
                hintBtn.id = 'hintBtn';
                hintBtn.textContent = '💡 Hint';
                hintBtn.style.cssText = 'padding: 12px 30px; background: #ed8936; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s; min-width: 120px;';
                hintBtn.onclick = () => context.getHint();
            } else {
                hintBtn.style.display = 'block';
                hintBtn.disabled = false;
            }
            
            // Update footer with restored buttons
            footer.innerHTML = '';
            footer.appendChild(hintBtn);
            footer.appendChild(submitBtn);
            
            // Update context references
            context.hintBtn = hintBtn;
            context.submitBtn = submitBtn;
            
            // Reset UI elements
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) {
                optionsContainer.style.display = 'grid';
            }
            
            // Reset counter
            const counterEl = document.querySelector('.question-counter');
            if (counterEl) {
                counterEl.textContent = `${context.currentQuestionIndex + 1}/${context.questions.length}`;
                counterEl.style.fontSize = '';
            }
            
            // Reset question text
            const questionText = document.querySelector('.question-text');
            if (questionText) {
                questionText.innerHTML = '';
            }
            
            // Clear any selected state
            context.selectedOption = null;
            context.answerSubmitted = false;
            context.hintUsed = false;
            
            // Advance past the study simulation question
            context.currentQuestionIndex++;
            
            // Reload the next question or content
            if (context.currentQuestionIndex < context.questions.length) {
                const currentQuestion = context.questions[context.currentQuestionIndex];
                if (currentQuestion && currentQuestion.question_type !== 'SIM') {
                    context.renderOptions(currentQuestion);
                }
            }
            
            // Continue to next content
            console.log('   Continuing to next content');
            context.loadNextContent();
        };
        
        footer.appendChild(continueBtn);
        console.log('✅ Continue button added to footer for study recap');
    },

    async loadSimulationQuestion(question, context) {
        console.log('🎮 Loading simulation question (labeling mode)');
        
        try {
            if (!window.SimulationLoader) {
                await this.loadScript('/js/simulation-loader.js');
                await SimulationLoader.init();
            }
            
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) optionsContainer.style.display = 'none';
            
            const simContainer = document.createElement('div');
            simContainer.id = 'simulation-container';
            simContainer.style.cssText = 'width:100%; min-height:500px; margin:20px 0;';
            
            const questionText = document.querySelector('.question-text');
            if (questionText) questionText.parentNode.insertBefore(simContainer, questionText.nextSibling);
            
            const simElement = await SimulationLoader.loadSimulation({ ...question, mode_sim: question.mode_sim || 'labeling' });
            simContainer.appendChild(simElement);
            
            // Check simulation mode and setup accordingly
            if (question.mode_sim === 'study') {
                // Update header to show study mode
                const counterEl = document.querySelector('.question-counter');
                if (counterEl) {
                    counterEl.innerHTML = '📚 <span style="color: #9f7aea;">Study Guide</span>';
                }
                
                const questionText = document.querySelector('.question-text');
                if (questionText) {
                    questionText.innerHTML = `<span style="color: #9f7aea;">📚 STUDY MODE:</span> ${question.title || 'Review this topic before continuing'}`;
                }
                
                // Hide submit and hint buttons for study mode
                const submitBtn = document.querySelector('.submit-btn');
                const hintBtn = document.querySelector('.hint-btn');
                if (submitBtn) submitBtn.style.display = 'none';
                if (hintBtn) hintBtn.style.display = 'none';
                
                this.addStudyMessage();
                this.setupStudyContinueButton(question, context);
            } else {
                this.setupLabelingSim(question, context);
            }
        } catch (err) {
            console.error('Error loading simulation:', err);
        }
    },

    setupLabelingSim(question, context) {
        console.log('🏷️ Setting up LABELING mode');
        
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.disabled = true;
            submitBtn.textContent = '✅ Submit Answers';
        }
        
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';
        
        setTimeout(() => {
            window.onSimulationSubmit = (result) => {
                console.log('Simulation result:', result);
                context.answers.push({
                    questionId: question.id,
                    type: 'simulation',
                    mode: 'labeling',
                    isCorrect: result.isCorrect,
                    correctCount: result.correct,
                    totalCount: result.total,
                    timeSpent: (Date.now() - context.questionStartTime) / 1000
                });
                context.currentQuestionIndex++;
                context.loadNextContent();
            };
        }, 1000);
    },
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};

window.QuestStudy = QuestStudy;