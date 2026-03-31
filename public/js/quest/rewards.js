// quest/rewards.js - Reward Systems
export const QuestRewards = {
    async trackEmotion(userId, emotion, intensity, context, responseTime) {
        try {
            await fetch('/api/gamification/emotion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, emotion, intensity, context, responseTime: Math.floor(responseTime) })
            });
        } catch (err) {}
    },

    async trackReward(userId, isCorrect, hintUsed, subject, showRewardAnimation) {
        try {
            const response = await fetch('/api/gamification/award', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, subject, isCorrect, hintUsed, context: 'answer_correct' })
            });
            const data = await response.json();
            if (data.awarded && (data.awarded.subjectGems > 0 || data.awarded.overallGems > 0)) {
                showRewardAnimation(data.awarded);
            }
            return data;
        } catch (err) {
            console.error('Error tracking reward:', err);
            return null;
        }
    },

    async updateStreak(userId, isCorrect, characterSystem) {
        try {
            const response = await fetch('/api/gamification/streak/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isCorrect })
            });
            const data = await response.json();
            if (characterSystem && data.currentStreak > 0 && data.currentStreak % 3 === 0) {
                characterSystem.onStreak(data.currentStreak);
            }
            return data;
        } catch (err) {
            return null;
        }
    },

    async updateCoins(userId, isCorrect, hintUsed, updateCoinDisplay) {
        console.log(`🪙 Updating coins for user ${userId}: isCorrect=${isCorrect}, hintUsed=${hintUsed}`);
        
        try {
            const response = await fetch('/api/coins/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isCorrect, hintUsed })
            });
            
            if (!response.ok) {
                console.error(`Coin update failed: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            console.log(`🪙 Coin update result:`, data);
            
            if (data && data.newBalance !== undefined) {
                updateCoinDisplay(data.newBalance);
            }
            return data;
        } catch (err) {
            console.error('Error updating coins:', err);
            return null;
        }
    },

    updateCoinDisplay(balance) {
        const coinEl = document.getElementById('coin-balance');
        if (coinEl) {
            coinEl.textContent = `🪙 ${balance}`;
            console.log(`💰 Coin display updated: ${balance}`);
        }
    },

    updateParameterDisplays(params, answers) {
        const accuracyEl = document.getElementById('param-accuracy');
        if (accuracyEl) accuracyEl.textContent = Math.round(params.accuracy) + '%';
        
        const masteryEl = document.getElementById('param-mastery');
        if (masteryEl) masteryEl.textContent = Math.round(params.mastery) + '%';
        
        const confidenceEl = document.getElementById('param-confidence');
        if (confidenceEl) confidenceEl.textContent = Math.round(params.confidence) + '%';
        
        const confidenceBar = document.getElementById('confidence-bar');
        if (confidenceBar) confidenceBar.style.width = params.confidence + '%';
        
        const frustrationEl = document.getElementById('param-frustration');
        if (frustrationEl) frustrationEl.textContent = Math.round(params.frustration) + '%';
        
        const frustrationBar = document.getElementById('frustration-bar');
        if (frustrationBar) frustrationBar.style.width = params.frustration + '%';
        
        const hintsEl = document.getElementById('param-hints');
        if (hintsEl) hintsEl.textContent = Math.round(params.hintUsage) + '%';
        
        const hintCount = answers.filter(a => a.hintUsed).length;
        const hintCountEl = document.getElementById('hint-count');
        if (hintCountEl) hintCountEl.textContent = `${hintCount} used`;
    }
};