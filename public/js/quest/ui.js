// quest/ui.js - UI Effects and Animations
const QuestUI = {
showDoubleScreenFlash(type) {
    const existing = document.querySelector('.screen-flash');
    if (existing) existing.remove();
    
    const flash = document.createElement('div');
    flash.className = `screen-flash ${type}`;
    document.body.appendChild(flash);
    
    // Different durations based on type
    let duration = 800;
    if (type === 'challenge-complete') duration = 1200;
    if (type === 'quest-complete') duration = 800;
    if (type === 'correct') duration = 700;
    if (type === 'wrong') duration = 500;
    
    setTimeout(() => {
        if (flash.parentNode) flash.remove();
    }, duration);
},

    showWordFlash(word) {
        const existing = document.querySelector('.word-flash');
        if (existing) existing.remove();
        
        const wordEl = document.createElement('div');
        wordEl.className = 'word-flash';
        wordEl.textContent = word.toUpperCase();
        document.body.appendChild(wordEl);
        
        setTimeout(() => {
            if (wordEl.parentNode) wordEl.remove();
        }, 600);
    },

    showCoinAnimation(change) {
        const animation = document.createElement('div');
        animation.className = `coin-animation ${change > 0 ? 'gain' : 'loss'}`;
        animation.innerHTML = change > 0 ? `+${change} 🪙` : `${change} 🪙`;
        
        document.body.appendChild(animation);
        setTimeout(() => animation.remove(), 1000);
        
        if (window.MANYAAudioSystem) {
            if (change > 0) {
                window.MANYAAudioSystem.playCoinCollect();
            } else if (change < 0) {
                window.MANYAAudioSystem.playCoinDeduct();
            }
        }
    },

    showRewardAnimation(awarded) {
        if (!awarded.subjectGems && !awarded.overallGems) return;
        
        const animation = document.createElement('div');
        animation.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none; z-index:10000; background:rgba(0,0,0,0.8); color:gold; padding:15px 25px; border-radius:50px; font-weight:bold; font-size:1.2em; animation:floatUp 1s ease-out forwards;';
        animation.innerHTML = `+${awarded.subjectGems} 🎨 +${awarded.overallGems} ⭐`;
        document.body.appendChild(animation);
        setTimeout(() => animation.remove(), 1000);
        
        if (window.MANYAAudioSystem && window.MANYAAudioSystem.playGemCollect && awarded.subjectGems > 0) {
            window.MANYAAudioSystem.playGemCollect();
        }
    },

    showGrowthMindsetMessage() {
        const messages = [
            "🌱 We grow from this!",
            "📚 That's how we learn!",
            "💪 Every step counts!",
            "🧠 Building knowledge!",
            "✨ Learning in progress!",
            "🎯 Closer every time!",
            "🌟 Great effort!",
            "💡 Now we know!",
            "🚀 Forward we go!",
            "⭐ Progress, not perfection!"
        ];
        
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        const msgContainer = document.createElement('div');
        msgContainer.className = 'growth-message';
        msgContainer.innerHTML = `<div class="growth-text">${message}</div>`;
        msgContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            padding: 16px 32px;
            border-radius: 60px;
            z-index: 20002;
            white-space: nowrap;
            animation: growthPop 0.4s ease-out forwards;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(msgContainer);
        
        setTimeout(() => {
            msgContainer.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => msgContainer.remove(), 300);
        }, 2000);
    },

    // FIXED: Corrected syntax for showLearningModal
    showLearningModal(question, selectedOption, correctAnswer, getOptionText, onContinue, detailedSolution = '') {
        const modal = document.createElement('div');
        modal.className = 'learning-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 24px;
            padding: 28px;
            max-width: 400px;
            width: 90%;
            z-index: 20000;
            box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.2);
            border-top: 4px solid #fbbf24;
            animation: modalRise 0.3s ease-out;
        `;
        
        const solutionText = detailedSolution || `The correct answer is ${correctAnswer}. ${getOptionText(question, correctAnswer)}`;
        
        modal.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 2.5rem;">📚</div>
                <h2 style="color: #fbbf24; margin: 8px 0 4px; font-size: 1.4rem; font-weight: 600;">Learning Moment</h2>
            </div>
            
            <div style="background: #fef9e7; padding: 16px; border-radius: 16px; margin-bottom: 20px;">
                <p style="margin-bottom: 8px; color: #92400e;">
                    <span style="font-weight: 500;">You chose:</span> 
                    <span>${selectedOption} - ${getOptionText(question, selectedOption)}</span>
                </p>
                <p style="color: #2b6e3c;">
                    <span style="font-weight: 500;">Remember:</span> 
                    <span style="font-weight: 500;">✓ ${correctAnswer} - ${getOptionText(question, correctAnswer)}</span>
                </p>
            </div>
            
            <div style="background: #f8fafc; padding: 16px; border-radius: 16px; margin-bottom: 24px;">
                <p style="color: #334155; line-height: 1.5; font-size: 0.95rem;">${solutionText}</p>
            </div>
            
            <button id="continue-learning" style="
                width: 100%;
                background: #fbbf24;
                color: #78350f;
                border: none;
                padding: 12px;
                border-radius: 40px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            ">Continue Learning →</button>
        `;
        
        document.body.appendChild(modal);
        
        const continueBtn = modal.querySelector('#continue-learning');
        continueBtn.onmouseover = () => continueBtn.style.background = '#f59e0b';
        continueBtn.onmouseout = () => continueBtn.style.background = '#fbbf24';
        
        continueBtn.onclick = () => {
            modal.remove();
            onContinue();
        };
    },

    showChestUnlockAnimation() {
        const chestAnimation = document.createElement('div');
        chestAnimation.className = 'chest-unlock-animation';
        chestAnimation.innerHTML = `
            <div class="chest-unlock-content">
                <div class="chest-icon">🎁</div>
                <div class="chest-text">NEW CHEST UNLOCKED!</div>
                <div class="chest-sparkles">✨ ✨ ✨</div>
            </div>
        `;
        chestAnimation.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 50px;
            border-radius: 20px;
            color: white;
            text-align: center;
            z-index: 20001;
            animation: chestPop 0.5s ease-out;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(chestAnimation);
        
        setTimeout(() => {
            chestAnimation.style.animation = 'chestFadeOut 0.5s ease-out';
            setTimeout(() => chestAnimation.remove(), 500);
        }, 2000);
    },

    showChestDrop(chestType) {
        const drop = document.createElement('div');
        const icon = chestType === 'gold' ? '👑 Gold' : chestType === 'silver' ? '🥈 Silver' : '🥉 Bronze';
        drop.style.cssText = `
            position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
            padding: 15px 30px; border-radius: 30px; border: 2px solid #fbbf24;
            font-weight: bold; color: #78350f; z-index: 20005;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: dropDown 0.5s ease-out forwards;
        `;
        drop.innerHTML = `🎁 You found a <b>${icon} Chest</b>! Check your profile later.`;
        document.body.appendChild(drop);
        if (window.MANYAAudioSystem) window.MANYAAudioSystem.playCoinCollect();
        setTimeout(() => {
            drop.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => drop.remove(), 500);
        }, 3000);
    },

    showAchievementPopup(ach) {
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background: #1e293b; color: white; padding: 15px 20px;
            border-radius: 12px; border-left: 4px solid #10b981;
            z-index: 20010; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideInRight 0.5s ease-out forwards; display: flex; align-items: center; gap: 15px;
        `;
        popup.innerHTML = `
            <div style="font-size: 2rem;">${ach.icon || '🏆'}</div>
            <div>
                <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Achievement Unlocked</div>
                <div style="font-weight: 600; font-size: 1.1rem; margin-top: 2px;">${ach.name}</div>
                <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 4px;">${ach.reward_gems ? '+' + ach.reward_gems + ' 💎' : ''} ${ach.reward_coins ? '+' + ach.reward_coins + ' 🪙' : ''}</div>
            </div>
        `;
        document.body.appendChild(popup);
        setTimeout(() => {
            popup.style.animation = 'fadeOutRight 0.5s ease-out forwards';
            setTimeout(() => popup.remove(), 500);
        }, 5000);
    },

    showCompletion(mastery, accuracy, completeData, onContinue) {
        const overlay = document.querySelector('.quest-complete-overlay');
        if (!overlay) return;
        
        let rewardMarkup = `
            <div style="font-size:1.2rem; margin:10px 0; color:#475569;">📊 Accuracy: ${Math.round(accuracy)}%</div>
            ${completeData.gemsAwarded ? `<div style="font-size:1.4rem; color:#8b5cf6; margin:8px 0;">💎 Earned ${completeData.gemsAwarded} Gems!</div>` : ''}
            ${completeData.chestAwarded ? `<div style="font-size:1.4rem; color:#f59e0b; margin:8px 0;">🎁 Earned 1 ${completeData.chestAwarded.toUpperCase()} Chest!</div>` : ''}
        `;

        if (completeData.achievementsUnlocked && completeData.achievementsUnlocked.length > 0) {
            rewardMarkup += `<div style="margin-top:15px; border-top:1px solid #cbd5e1; padding-top:10px;">
                <h4 style="color:#10b981; font-weight:bold;">🏆 Achievements Unlocked!</h4>`;
            completeData.achievementsUnlocked.forEach(a => {
                rewardMarkup += `<div style="font-size:0.9rem; color:#334155;">${a.icon} ${a.name}</div>`;
            });
            rewardMarkup += `</div>`;
        }

        // Remove mastery percentage display natively, swap with dynamic data
        const mScore = overlay.querySelector('.mastery-score');
        if (mScore) mScore.style.display = 'none';

        overlay.querySelector('.earned-rewards').innerHTML = `
            <div style="font-size:1.8rem; font-weight:bold; margin-bottom:15px; color:#1e293b;">${completeData.stars > 0 ? '🎉 Quest Cleared!' : '🛡️ Quest Finished'}</div>
            ${rewardMarkup}
        `;
        overlay.querySelector('.continue-btn').onclick = onContinue;
        overlay.style.display = 'flex';
    }
};

window.QuestUI = QuestUI;