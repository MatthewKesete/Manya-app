const pool = require('../config/database');
const coinService = require('./coinService');
const chestService = require('./chestService');
const gamificationService = require('./gamificationService');

class AchievementService {
    
    /**
     * Checks if a user already earned an achievement
     */
    async hasAchievement(userId, achievementId) {
        const res = await pool.query(
            `SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2`,
            [userId, achievementId]
        );
        return res.rows.length > 0;
    }

    /**
     * Get criteria value dynamically based on type
     */
    async evaluateCriterion(userId, conditionType, conditionSubtopicId) {
        switch(conditionType) {
            case 'questions_answered':
                const qtRes = await pool.query(
                    `SELECT COUNT(*) as total FROM user_answer WHERE "userId" = $1`,
                    [userId]
                );
                return parseInt(qtRes.rows[0].total) || 0;

            case 'streak_days':
                const streakData = await gamificationService.getStreak(userId);
                return streakData.current_streak || 0;

            case 'chests_opened':
                const chestsRes = await pool.query(
                    `SELECT COUNT(*) as total FROM user_chests WHERE user_id = $1 AND opened = true`,
                    [userId]
                );
                return parseInt(chestsRes.rows[0].total) || 0;

            case 'quests_completed':
                // Count how many quests have been played (rows in user_challenge_progress)
                const qcRes = await pool.query(
                    `SELECT COUNT(*) as total FROM user_challenge_progress WHERE "userId" = $1`,
                    [userId]
                );
                return parseInt(qcRes.rows[0].total) || 0;

            case 'speed_modes_won':
                // Needs mode tracking, assume 0 if not implemented yet
                return 0;

            case 'mastery_percent':
                return 0;

            default:
                return 0;
        }
    }

    /**
     * Main evaluating function for all active achievements
     */
    async checkAndAwardAchievements(userId) {
        try {
            const achRes = await pool.query(`SELECT * FROM achievements WHERE is_active = true ORDER BY sort_order ASC`);
            const achievements = achRes.rows;
            const newUnlocks = [];

            for (const ach of achievements) {
                const alreadyEarned = await this.hasAchievement(userId, ach.id);
                if (alreadyEarned) continue;

                // Evaluate condition
                const currentValue = await this.evaluateCriterion(userId, ach.condition_type, ach.condition_subtopic_id);
                
                if (currentValue >= ach.condition_value) {
                    // Give rewards!
                    await pool.query(
                        `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [userId, ach.id]
                    );

                    console.log(`🏆 User ${userId} unlocked achievement: ${ach.name} (${currentValue}/${ach.condition_value})`);

                    if (ach.reward_coins > 0) {
                        await coinService.initializeUser(userId);
                        await pool.query(`UPDATE user_coins SET coin_balance = coin_balance + $2 WHERE user_id = $1`, [userId, ach.reward_coins]);
                    }

                    if (ach.reward_gems > 0) {
                        await gamificationService.initializeUser(userId);
                        await gamificationService.awardGems(userId, 'general', 0, ach.reward_gems, `achievement_${ach.id}`);
                    }

                    if (ach.reward_chest_type) {
                        await chestService.awardChest(userId, ach.reward_chest_type);
                    }

                    if (ach.reward_unlock_content && ach.reward_unlock_content.length > 0) {
                        for (const content of ach.reward_unlock_content) {
                            await pool.query(
                                `INSERT INTO unlocked_content (user_id, content_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                [userId, content]
                            );
                        }
                    }

                    newUnlocks.push(ach);
                }
            }

            return newUnlocks;

        } catch (err) {
            console.error('Error checking achievements:', err);
            return [];
        }
    }
}

module.exports = new AchievementService();
