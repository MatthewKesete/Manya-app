const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/manya_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to PostgreSQL:', err);
    } else {
        console.log('✅ Connected to PostgreSQL');
        release();
    }
});

module.exports = pool;