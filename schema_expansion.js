const pool = require('./server/config/database');

async function migrate() {
    try {
        console.log('Starting gamification schema expansion migration...');

        // Backup existing achievements table if it has the old schema
        await pool.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'achievements' AND column_name = 'userId'
                ) THEN
                    ALTER TABLE achievements RENAME TO achievements_old;
                END IF;
            END $$;
        `);

        // 1. Achievements
        await pool.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                icon TEXT,
                category VARCHAR(50),
                condition_type VARCHAR(50) NOT NULL,
                condition_value INTEGER NOT NULL,
                condition_subtopic_id INTEGER NULL,
                reward_coins INTEGER DEFAULT 0,
                reward_gems INTEGER DEFAULT 0,
                reward_chest_type VARCHAR(20) NULL,
                reward_unlock_content TEXT[] DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                sort_order INTEGER DEFAULT 100
            );
        `);

        // 2. User Achievements
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                user_id TEXT,
                achievement_id INTEGER REFERENCES achievements(id),
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, achievement_id)
            );
        `);

        // 3. Chests
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_chests (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                chest_type VARCHAR(20) NOT NULL,
                opened BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                opened_at TIMESTAMP NULL
            );
        `);

        // 4. Chest Reward Pool
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chest_reward_pool (
                id SERIAL PRIMARY KEY,
                chest_type VARCHAR(20) NOT NULL,
                reward_type VARCHAR(30) NOT NULL,
                reward_value TEXT,
                min_amount INTEGER DEFAULT 1,
                max_amount INTEGER DEFAULT 1,
                probability FLOAT DEFAULT 1.0,
                is_active BOOLEAN DEFAULT true
            );
        `);

        // 5. Unlocked Content
        await pool.query(`
            CREATE TABLE IF NOT EXISTS unlocked_content (
                user_id TEXT,
                content_id TEXT,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, content_id)
            );
        `);

        // Baseline Data Insertions
        // Populate Chest Reward Pool
        await pool.query(`
            INSERT INTO chest_reward_pool (chest_type, reward_type, reward_value, min_amount, max_amount, probability) VALUES
            -- Bronze
            ('bronze', 'coins', '30', 20, 40, 1.0),
            ('bronze', 'recap', 'recap_auto', 1, 1, 0.5),

            -- Silver
            ('silver', 'coins', '50', 40, 60, 1.0),
            ('silver', 'gems', '1', 1, 2, 1.0),
            ('silver', 'study_sim', 'sim_auto', 1, 1, 0.7),

            -- Gold
            ('gold', 'coins', '80', 60, 100, 1.0),
            ('gold', 'gems', '2', 2, 3, 1.0),
            ('gold', 'mode_speed', 'mode_speed_timer', 1, 1, 0.4),
            ('gold', 'mode_reverse', 'mode_reverse', 1, 1, 0.3)
            ON CONFLICT DO NOTHING;
        `);

        // Populate Achievements
        const testAchs = await pool.query(`SELECT COUNT(*) FROM achievements`);
        if (parseInt(testAchs.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO achievements (name, description, icon, category, condition_type, condition_value, reward_coins, reward_gems) VALUES
                ('First Steps', 'Answer your first 20 questions', '🔰', 'progress', 'questions_answered', 20, 30, 1),
                ('Consistent Learner', 'Reach a 7 day streak', '🔥', 'streak', 'streak_days', 7, 50, 2),
                ('Speed Demon', 'Win 5 speed modes', '⚡', 'mode', 'speed_modes_won', 5, 40, 3),
                ('Treasure Hunter', 'Open 20 chests', '🕵️', 'collection', 'chests_opened', 20, 100, 6)
            `);
        }

        console.log('Migration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
