const pool = require('./server/config/database');

async function main() {
    try {
        // Check unlocked_content columns
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'unlocked_content'
        `);
        console.log('unlocked_content columns:', cols.rows);

        // Try a basic select
        const rows = await pool.query(`SELECT * FROM unlocked_content LIMIT 3`);
        console.log('unlocked_content rows:', rows.rows);

    } catch(e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}
main();
