// quest/study.js - Study Mode Handling
export const QuestStudy = {
    async showStudySim(studySim, context) {
        console.log('📚 Showing study simulation');
        context.isStudyMode = true;
        
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.style.display = 'none';
        
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) submitBtn.style.display = 'none';
        
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';
        
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) counterEl.innerHTML = '📚 <span style="color: #9f7aea;">Study Guide</span>';
        
        const questionText = document.querySelector('.question-text');
        if (questionText) questionText.innerHTML = `<span style="color: #9f7aea;">📚 STUDY MODE:</span> ${studySim.title || 'Explore the model'}`;
        
        const simContainer = document.createElement('div');
        simContainer.id = 'simulation-container';
        simContainer.style.cssText = 'width:100%; min-height:500px; margin:20px 0;';
        
        const questionTextEl = document.querySelector('.question-text');
        if (questionTextEl) questionTextEl.parentNode.insertBefore(simContainer, questionTextEl.nextSibling);
        
        try {
            if (!window.SimulationLoader) {
                await this.loadScript('/js/simulation-loader.js');
                await SimulationLoader.init();
            }
            const simElement = await SimulationLoader.loadSimulation(studySim);
            simContainer.appendChild(simElement);
        } catch (err) {
            simContainer.innerHTML = '<div style="color:red;">Failed to load study guide</div>';
        }
        
        this.addStudyMessage();
        this.setupStudyContinueButton(studySim, context);
    },

    addStudyMessage() {
        const questionArea = document.querySelector('.gameplay-area');
        if (!questionArea) return;
        
        // Remove existing study message if any
        const existing = document.querySelector('.study-message');
        if (existing) existing.remove();
        
        const studyMessage = document.createElement('div');
        studyMessage.className = 'study-message';
        studyMessage.style.cssText = 'background:#9f7aea20; border-left:4px solid #9f7aea; padding:15px; margin:20px 0; border-radius:8px;';
        studyMessage.innerHTML = '<strong>📚 Study Guide</strong><p style="margin-top:8px;">Take your time to explore. Click "Continue" when ready.</p>';
        questionArea.insertBefore(studyMessage, questionArea.firstChild);
    },

    setupStudyContinueButton(studySim, context) {
        console.log('🔘 Setting up Continue button for study mode');
        
        // Remove any existing continue button
        const existingBtn = document.getElementById('simulation-done-btn');
        if (existingBtn) existingBtn.remove();
        
        // Find the footer or create a button container
        let footer = document.querySelector('.gameplay-footer');
        
        // If footer doesn't exist, create a container
        if (!footer) {
            console.log('Creating new footer for continue button');
            footer = document.createElement('div');
            footer.className = 'gameplay-footer';
            footer.style.cssText = 'display: flex; justify-content: center; align-items: center; padding: 20px; margin-top: 20px; border-top: 1px solid #e2e8f0;';
            const gameplayArea = document.querySelector('.gameplay-area');
            if (gameplayArea) {
                gameplayArea.parentNode.insertBefore(footer, gameplayArea.nextSibling);
            } else {
                document.body.appendChild(footer);
            }
        }
        
        // Create continue button
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
        
        // Add hover effect
        continueBtn.onmouseover = () => {
            continueBtn.style.transform = 'translateY(-2px)';
            continueBtn.style.boxShadow = '0 8px 25px rgba(128, 90, 213, 0.4)';
        };
        continueBtn.onmouseout = () => {
            continueBtn.style.transform = 'translateY(0)';
            continueBtn.style.boxShadow = '0 4px 15px rgba(128, 90, 213, 0.3)';
        };
        
        // Add click handler
        continueBtn.onclick = () => {
            console.log('✅ Continue button clicked - moving to next content');
            
            // Track that they viewed the study sim
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
            
            // Show MCQ elements
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) optionsContainer.style.display = 'grid';
            
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) submitBtn.style.display = 'block';
            
            const hintBtn = document.querySelector('.hint-btn');
            if (hintBtn) hintBtn.style.display = 'block';
            
            // Reset counter
            const counterEl = document.querySelector('.question-counter');
            if (counterEl) {
                counterEl.textContent = `${context.currentQuestionIndex + 1}/${context.questions.length}`;
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
            
            // Load next content
            context.loadNextContent();
        };
        
        // Clear footer and add button
        footer.innerHTML = '';
        footer.appendChild(continueBtn);
        
        console.log('✅ Continue button added to footer');
    },

    async loadSimulationQuestion(question, context) {
        console.log('🎮 Loading simulation question');
        
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
            
            this.setupLabelingSim(question, context);
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