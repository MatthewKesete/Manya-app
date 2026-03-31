// quest/core.js - Core Methods
import { QuestUtils } from './utils.js';
import { QuestUI } from './ui.js';
import { QuestRewards } from './rewards.js';
import { QuestAnswer } from './answer.js';
import { QuestStudy } from './study.js';

export const QuestCore = {
    init(questData, challenge, onComplete, context) {
        console.log('🎮 Initializing quest:', questData);
        
        const template = document.getElementById('gameplay-view');
        if (!template) {
            console.error('❌ Template missing');
            alert('System error: Game template missing.');
            return;
        }
        
        context.questData = questData;
        context.challenge = challenge;
        context.questions = questData.questions || [];
        context.studySims = questData.studySims || [];
        context.currentQuestionIndex = 0;
        context.currentStudySimIndex = -1;
        context.isStudyMode = false;
        context.answers = [];
        context.onComplete = onComplete;
        
        context.currentSubject = QuestUtils.detectSubject(questData, challenge);
        
        context.startTime = Date.now();
        context.params.frustration = 0;
        context.params.confidence = 70;
        context.hintUsed = false;
        context.selectedOption = null;
        context.answerSubmitted = false;
        
        this.render(context);
        context.loadNextContent();
        this.loadPsychologicalParams(context);
        
        if (questData.gameMode && questData.gameMode !== 'none' && window.GameModes) {
            window.GameModes.init(questData.gameMode, questData.gameMode === 'timed' ? 30 : null, () => context.handleTimeUp(), questData.questId);
        }
    },

    render(context) {
        console.log('🎨 Rendering gameplay view...');
        
        try {
            const template = document.getElementById('gameplay-view');
            if (!template) return;
            
            const templateContent = template.content.cloneNode(true);
            
            const questNameEl = templateContent.querySelector('.current-quest-name');
            const counterEl = templateContent.querySelector('.question-counter');
            const backBtn = templateContent.querySelector('.back-btn');
            const hintBtn = templateContent.querySelector('.hint-btn');
            const submitBtn = templateContent.querySelector('.submit-btn');
            
            if (questNameEl) questNameEl.textContent = context.questData.name || 'Quest';
            if (counterEl) counterEl.textContent = `0/${context.questions.length}`;
            
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    if (confirm('Exit quest?')) context.exit();
                });
            }
            
            if (hintBtn) hintBtn.addEventListener('click', () => context.getHint());
            if (submitBtn) submitBtn.addEventListener('click', () => context.submitAnswer());
            
            const contentArea = document.getElementById('content-area');
            if (contentArea) {
                contentArea.innerHTML = '';
                contentArea.appendChild(templateContent);
            }
            
            setTimeout(() => {
                context.hintBtn = document.getElementById('hintBtn');
                context.submitBtn = document.getElementById('submitBtn');
                context.hintDisplay = document.getElementById('hintDisplay');
            }, 100);
            
        } catch (err) {
            console.error('Error in render:', err);
        }
    },

    loadNextContent(context) {
        console.log('🔄 Loading next content...');
        
        if (context.currentStudySimIndex < context.studySims.length - 1) {
            context.currentStudySimIndex++;
            const studySim = context.studySims[context.currentStudySimIndex];
            QuestStudy.showStudySim(studySim, context);
            return;
        }
        
        if (context.currentQuestionIndex < context.questions.length) {
            this.loadQuestion(context.currentQuestionIndex, context);
        } else {
            context.completeQuest();
        }
    },

loadQuestion(index, context) {
    if (index >= context.questions.length) {
        context.completeQuest();
        return;
    }
    
    context.currentQuestionIndex = index;
    const question = context.questions[index];
    
    // Make sure options container is visible and cleared
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.style.display = 'grid';
        optionsContainer.innerHTML = '';
    }
    
    // Make sure submit and hint buttons are visible
    const submitBtn = document.querySelector('.submit-btn');
    const hintBtn = document.querySelector('.hint-btn');
    
    if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.textContent = '✅ Submit Answer';
    }
    if (hintBtn) {
        hintBtn.style.display = 'block';
        hintBtn.disabled = false;
    }
    
    // Remove any lingering simulation elements
    const simContainer = document.getElementById('simulation-container');
    if (simContainer) simContainer.remove();
    
    const studyMessage = document.querySelector('.study-message');
    if (studyMessage) studyMessage.remove();
    
    const continueBtn = document.getElementById('simulation-done-btn');
    if (continueBtn) continueBtn.remove();
    
    if (question.question_type === 'SIM') {
        QuestStudy.loadSimulationQuestion(question, context);
        return;
    }
    
    // Reset state
    context.selectedOption = null;
    context.answerSubmitted = false;
    context.hintUsed = false;
    context.answerChanged = false;
    context.changeCount = 0;
    
    // Update counter
    const counterEl = document.querySelector('.question-counter');
    if (counterEl) counterEl.textContent = `${index + 1}/${context.questions.length}`;
    
    // Set question text
    const questionTextEl = document.querySelector('.question-text');
    if (questionTextEl) questionTextEl.textContent = question.text || 'Question text missing';
    
    // Set topic badge
    const topicBadgeEl = document.querySelector('.topic-badge');
    if (topicBadgeEl) topicBadgeEl.textContent = context.challenge?.name || 'Topic';
    
    // Set difficulty badge
    const difficultyEl = document.querySelector('.difficulty-badge');
    if (difficultyEl) {
        const difficulty = question.difficulty || 'M';
        difficultyEl.textContent = difficulty === 'E' ? 'Easy' : difficulty === 'M' ? 'Medium' : 'Hard';
        difficultyEl.className = 'difficulty-badge ' + (difficulty === 'E' ? 'easy' : difficulty === 'M' ? 'medium' : 'hard');
    }
    
    // Render options
    QuestAnswer.renderOptions(question, (letter) => QuestAnswer.selectOption(letter, context));
    
    // Reset hint display
    if (context.hintDisplay) {
        context.hintDisplay.style.display = 'none';
        context.hintDisplay.textContent = '';
    }
    
    context.questionStartTime = Date.now();
    this.startHesitationTracking(context);
},

    startHesitationTracking(context) {
        context.questionStartTime = Date.now();
        
        if (context.hesitationTimer) clearInterval(context.hesitationTimer);
        
        context.hesitationTimer = setInterval(() => {
            const timeOnQuestion = (Date.now() - context.questionStartTime) / 1000;
            if (timeOnQuestion > 5 && !context.answerSubmitted && !context.selectedOption) {
                context.hesitationCount++;
            }
        }, 1000);
    },

    async loadPsychologicalParams(context) {
        try {
            const response = await fetch(`/api/psychological/state/${window.App?.currentUser || 'student-001'}`);
            const data = await response.json();
            context.params.confidence = data.confidence || 70;
            context.params.frustration = data.frustration || 0;
            QuestRewards.updateParameterDisplays(context.params, context.answers);
        } catch (err) {}
    },

    handleTimeUp(context) {
        console.log('⏰ TIME\'S UP!');
        context.completeQuest();
    },

    exit(context) {
        if (context.onComplete) context.onComplete();
    }
};