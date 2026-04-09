const pool = require('../config/database');
const coinService = require('./coinService');
const gamificationService = require('./gamificationService');

class ChestService {
    
    /**
     * Award a new chest to a user
     */
    async awardChest(userId, chestType) {
        try {
            const result = await pool.query(
                `INSERT INTO user_chests (user_id, chest_type, opened) 
                 VALUES ($1, $2, false) RETURNING id`,
                [userId, chestType]
            );
            console.log(`🎁 Awarded ${chestType} chest to ${userId}`);
            return { success: true, chestId: result.rows[0].id };
        } catch (err) {
            console.error('Error awarding chest:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Get user's unopened chests
     */
    async getUnopenedChests(userId) {
        try {
            const result = await pool.query(
                `SELECT id, chest_type, created_at FROM user_chests 
                 WHERE user_id = $1 AND opened = false ORDER BY created_at ASC`,
                [userId]
            );
            return result.rows;
        } catch (err) {
            console.error('Error getting unopened chests:', err);
            return [];
        }
    }

    /**
     * Open a specific chest and determine rewards
     */
    async openChest(userId, chestId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Verify chest exists and is unopened
            const chestReq = await client.query(
                `SELECT chest_type FROM user_chests WHERE id = $1 AND user_id = $2 AND opened = false FOR UPDATE`,
                [chestId, userId]
            );

            if (chestReq.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, error: 'Chest not found or already opened' };
            }

            const chestType = chestReq.rows[0].chest_type;

            // 2. Mark as opened
            await client.query(
                `UPDATE user_chests SET opened = true, opened_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [chestId]
            );

            // 3. Roll for rewards from the probability pool
            const poolReq = await client.query(
                `SELECT reward_type, reward_value, min_amount, max_amount, probability 
                 FROM chest_reward_pool 
                 WHERE chest_type = $1 AND is_active = true`,
                [chestType]
            );

            const rewardsGained = [];
            let totalCoins = 0;
            let totalGems = 0;

            for (const item of poolReq.rows) {
                // Determine if they win this item based on probability
                if (Math.random() <= item.probability) {
                    // Determine amount
                    const amount = Math.floor(Math.random() * (item.max_amount - item.min_amount + 1)) + item.min_amount;
                    
                    rewardsGained.push({ type: item.reward_type, value: item.reward_value, amount });

                    if (item.reward_type === 'coins') {
                        totalCoins += parseInt(item.reward_value || amount);
                    } else if (item.reward_type === 'gems') {
                        totalGems += parseInt(item.reward_value || amount);
                    } else {
                        // For study_sim, recap, modes - unlock them
                        const contentId = item.reward_value;
                        await client.query(
                            `INSERT INTO unlocked_content (user_id, content_id) 
                             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [userId, contentId]
                        );
                    }
                }
            }

            // 4. Disburse Coins and Gems
            if (totalCoins > 0) {
                await coinService.initializeUser(userId);
                await client.query(
                    `UPDATE user_coins SET coin_balance = coin_balance + $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
                    [userId, totalCoins]
                );
            }

            if (totalGems > 0) {
                await gamificationService.initializeUser(userId);
                await gamificationService.awardGems(userId, 'general', 0, totalGems, 'chest_open');
            }

            await client.query('COMMIT');
            return {
                success: true,
                chestType,
                rewards: rewardsGained,
                totalCoins,
                totalGems
            };

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error opening chest:', err);
            return { success: false, error: err.message };
        } finally {
            client.release();
        }
    }
}

module.exports = new ChestService();