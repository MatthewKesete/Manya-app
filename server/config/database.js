const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'manya_db',
    user: 'postgres',
    password: 'root',
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