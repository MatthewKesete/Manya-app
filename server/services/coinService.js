// server/services/coinService.js
const pool = require('../config/database');

class CoinService {
    
    // Initialize user's coin balance
    async initializeUser(userId) {
        await pool.query(
            `INSERT INTO user_coins (user_id, coin_balance) 
             VALUES ($1, 0) 
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );
    }
    
    // Get config
    async getConfig(key, defaultValue = 0) {
        try {
            const result = await pool.query('SELECT value FROM reward_config WHERE key = $1', [key]);
            if (result.rows.length > 0) return parseFloat(result.rows[0].value);
            return defaultValue;
        } catch (err) {
            console.error('Error fetching generic reward config:', err);
            return defaultValue;
        }
    }
    
    // Get user's coin balance
    async getCoinBalance(userId) {
        const result = await pool.query(
            `SELECT coin_balance FROM user_coins WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0]?.coin_balance || 0;
    }
    
    // Update coins based on answer (10 correct, 5 with hint, -10 wrong)
    async updateCoins(userId, isCorrect, hintUsed) {
        let coinChange = 0;
        
        if (isCorrect) {
            coinChange = hintUsed ? 5 : 10;
        } else {
            coinChange = -10;
        }
        
        const result = await pool.query(
            `UPDATE user_coins 
             SET coin_balance = coin_balance + $2, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1
             RETURNING coin_balance`,
            [userId, coinChange]
        );
        
        return {
            coinChange,
            newBalance: result.rows[0]?.coin_balance || 0
        };
    }
    
    // Check daily earnings limit
    async getDailyEarnings(userId, subtopicId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const result = await pool.query(
                `SELECT coins_earned FROM daily_coin_earnings 
                 WHERE user_id = $1 AND subtopic_id = $2 AND date = $3`,
                [userId, subtopicId, today]
            );
            return result.rows[0]?.coins_earned || 0;
        } catch (err) {
            console.error('Error fetching daily earnings:', err);
            return 0; // Return 0 to prevent block on error
        }
    }
    
    // Update daily earnings tracking
    async updateDailyEarnings(userId, subtopicId, coins) {
        try {
            const today = new Date().toISOString().split('T')[0];
            await pool.query(
                `INSERT INTO daily_coin_earnings (user_id, subtopic_id, date, coins_earned) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (user_id, subtopic_id, date) 
                 DO UPDATE SET coins_earned = daily_coin_earnings.coins_earned + $4`,
                [userId, subtopicId, today, coins]
            );
        } catch (err) {
            console.error('Error updating daily earnings:', err);
        }
    }
    
    // Mark a question as answered for a quest attempt to prevent farming
    async markQuestionAsAnswered(userId, questId, questionId) {
        try {
            await pool.query(
                `UPDATE user_quests 
                 SET answered_questions = array_append(answered_questions, $3)
                 WHERE "userId" = $1 AND "questId" = $2`,
                [userId, questId, questionId.toString()]
            );
        } catch (err) {
            console.error('Error tracking answered question:', err);
        }
    }

    // Modern coin award logic per user specification
    async awardCoinsOnCorrectAnswer(userId, questionId, subtopicId, currentQuestId, isSpeedOrReverse = false) {
        // 1. Check if already answered in this quest attempt
        const questResult = await pool.query(
            `SELECT answered_questions FROM user_quests 
             WHERE "userId" = $1 AND "questId" = $2`,
            [userId, currentQuestId]
        );
        
        const answeredStats = questResult.rows[0]?.answered_questions || [];
        if (answeredStats.includes(questionId.toString())) {
            return { awarded: 0, reason: 'already_answered' }; // No coins — already earned in attempt
        }

        // 2. Check daily limit for this subtopic
        const todayEarnings = await this.getDailyEarnings(userId, subtopicId);
        if (todayEarnings >= 300) {
            return { awarded: 0, reason: 'daily_limit_reached' };
        }

        // 3. Calculate coins (using DB config or defaults)
        const baseCoins = isSpeedOrReverse 
            ? await this.getConfig('coins_per_speed_correct', 15)
            : await this.getConfig('coins_per_correct', 10);

        // 4. Award coins
        // Safely add coins
        await this.initializeUser(userId);
        await pool.query(
            `UPDATE user_coins 
             SET coin_balance = coin_balance + $2, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1`,
            [userId, baseCoins]
        );
        
        await this.updateDailyEarnings(userId, subtopicId, baseCoins);
        await this.markQuestionAsAnswered(userId, currentQuestId, questionId);

        // Track earned for this attempt specifically
        await pool.query(
            `UPDATE user_quests 
             SET coins_earned_this_attempt = COALESCE(coins_earned_this_attempt, 0) + $3
             WHERE "userId" = $1 AND "questId" = $2`,
            [userId, currentQuestId, baseCoins]
        );

        return { awarded: baseCoins, reason: 'correct_answer' };
    }
    
    // Exchange coins for gems
    async exchangeCoinsForGems(userId, subject, coinAmount) {
        const COIN_TO_GEM_RATE = 500; // 500 coins = 1 gem
        
        const gemsToAward = Math.floor(coinAmount / COIN_TO_GEM_RATE);
        if (gemsToAward === 0) {
            return { success: false, message: 'Not enough coins' };
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Deduct coins
            const coinResult = await client.query(
                `UPDATE user_coins 
                 SET coin_balance = coin_balance - $2
                 WHERE user_id = $1 AND coin_balance >= $2
                 RETURNING coin_balance`,
                [userId, gemsToAward * COIN_TO_GEM_RATE]
            );
            
            if (coinResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Insufficient coins' };
            }
            
            // Award gems
            await client.query(
                `INSERT INTO subject_gems (user_id, subject, gem_count) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (user_id, subject) 
                 DO UPDATE SET gem_count = subject_gems.gem_count + $3`,
                [userId, subject, gemsToAward]
            );
            
            await client.query('COMMIT');
            
            return {
                success: true,
                gemsAwarded: gemsToAward,
                newCoinBalance: coinResult.rows[0].coin_balance,
                rate: COIN_TO_GEM_RATE
            };
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
}

    // Award bonus coins (e.g., from character interactions or streaks)
    async awardBonusCoins(userId, amount, reason) {
        await this.initializeUser(userId);
        
        const result = await pool.query(
            `UPDATE user_coins 
             SET coin_balance = coin_balance + $2, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1
             RETURNING coin_balance`,
            [userId, amount]
        );
        
        const newBalance = result.rows[0]?.coin_balance || 0;
        console.log(`💰 Bonus ${amount} coins awarded to ${userId} for ${reason}`);
        
        return {
            success: true,
            amount,
            newBalance,
            reason
        };
    }
}

module.exports = new CoinService();