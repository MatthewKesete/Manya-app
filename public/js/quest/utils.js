// js/quest/utils.js
window.QuestUtils = {
    extractCorrectLetter(correctAnswer) {
        if (!correctAnswer) return 'A';
        if (correctAnswer.startsWith('Option_')) return correctAnswer.replace('Option_', '');
        if (['A','B','C','D'].includes(correctAnswer)) return correctAnswer;
        return 'A';
    },

    detectSubject(questData, challenge) {
        if (challenge && challenge.subject) return challenge.subject;
        if (questData && questData.subject) return questData.subject;
        return 'science';
    },

    getOptionText(question, letter) {
        return question.options?.[letter] || '';
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