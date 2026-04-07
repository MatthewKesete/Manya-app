// quest/answer.js - Answer Handling
const QuestAnswer = {
    selectOption(letter, context) {
        if (context.answerSubmitted) return;
        
        if (context.selectedOption && context.selectedOption !== letter) {
            context.answerChanged = true;
            context.changeCount++;
        }
        
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.letter === letter) opt.classList.add('selected');
        });
        
        context.selectedOption = letter;
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) submitBtn.disabled = false;
    },

    renderOptions(question, onSelect) {
        const optionsContainer = document.getElementById('options-container');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        
        letters.forEach(letter => {
            const optionText = question.options?.[letter];
            if (!optionText) return;
            
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.dataset.letter = letter;
            optionDiv.innerHTML = `<span class="option-letter">${letter}.</span> ${optionText}`;
            optionDiv.addEventListener('click', () => onSelect(letter));
            optionsContainer.appendChild(optionDiv);
        });
    },

    async getHint(questionId, hintDisplay, setHintUsed, hintBtn) {
        try {
            const response = await fetch(`/api/hint/${questionId}`);
            const data = await response.json();
            
            if (hintDisplay) {
                hintDisplay.textContent = data.hint || "Think carefully about what you've learned!";
                hintDisplay.style.display = 'block';
            }
            
            setHintUsed(true);
            if (hintBtn) hintBtn.disabled = true;
        } catch (err) {
            if (hintDisplay) {
                hintDisplay.textContent = "Try to eliminate wrong answers first!";
                hintDisplay.style.display = 'block';
            }
            setHintUsed(true);
            if (hintBtn) hintBtn.disabled = true;
        }
    }
};

window.QuestAnswer = QuestAnswer;