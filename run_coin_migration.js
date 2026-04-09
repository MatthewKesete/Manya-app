const pool = require('./server/config/database');

async function migrate() {
    try {
        console.log('Starting coin migration...');

        // 1. Create reward_config table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reward_config (
                key TEXT PRIMARY KEY,
                value NUMERIC,
                description TEXT
            );
        `);

        // Insert configs
        await pool.query(`
            INSERT INTO reward_config (key, value, description) VALUES
            ('coins_per_correct', 10, 'Normal MCQ'),
            ('coins_per_speed_correct', 15, 'Speed or Reverse mode'),
            ('coins_per_1_star', 30, 'Quest completion bonus'),
            ('coins_per_2_star', 50, 'Quest completion bonus'),
            ('coins_per_3_star', 80, 'Quest completion bonus'),
            ('hint_cost', 25, 'Cost of one hint'),
            ('retry_cost', 40, 'Extra life / retry'),
            ('skip_quest_base', 350, 'Base cost to skip a quest'),
            ('skip_per_difficulty', 80, 'Added per difficulty level'),
            ('skip_per_question', 6, 'Added per question in quest')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        `);

        console.log('Reward config populated.');

        // 2. Alter user_quests (user mentioned quest_progress, but code uses user_quests)
        try {
            await pool.query(`
                ALTER TABLE user_quests 
                ADD COLUMN coins_earned_this_attempt INTEGER DEFAULT 0,
                ADD COLUMN answered_questions TEXT[] DEFAULT '{}';
            `);
            console.log('Added columns to user_quests.');
        } catch (err) {
            if (err.code === '42701') {
                console.log('Columns already exist on user_quests.');
            } else {
                console.log('Error altering user_quests:', err.message);
                
                // Maybe the table doesn't exist?
            }
        }

        // 3. Create daily_coin_earnings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_coin_earnings (
                user_id TEXT,
                subtopic_id TEXT,
                date DATE,
                coins_earned INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, subtopic_id, date)
            );
        `);
        console.log('Created daily_coin_earnings table.');

        console.log('Migration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
