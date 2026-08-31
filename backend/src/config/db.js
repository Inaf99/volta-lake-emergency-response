// Single shared PostgreSQL connection pool. Every model imports { pool }
// from here instead of creating its own connection.
const { Pool } = require('pg');
const env = require('./env');

if (!env.databaseUrl) {
  // We don't throw here — server.js decides how to react — but we warn
  // loudly because "why won't anything save" is a common class-demo bug.
  console.warn(
    '[db] WARNING: DATABASE_URL is not set. Copy backend/.env.example to backend/.env and configure it.'
  );
}

const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`[db] Connected to PostgreSQL. Server time: ${res.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('[db] Failed to connect to PostgreSQL:', err.message);
    return false;
  }
}

module.exports = { pool, testConnection };
