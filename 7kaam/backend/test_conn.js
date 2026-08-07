require('dotenv').config();
const { Pool } = require('pg');

// Dev utility: sanity-checks the DIRECT_URL connection string works, with
// and without SSL. Reads credentials from env — never hardcode them here.
if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL must be set in the environment (see backend/.env.example)');
}

const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: false });

pool.query('SELECT 1 as ok')
  .then(r => { console.log('✅ Connected (no SSL):', r.rows[0]); pool.end(); })
  .catch(e => {
    console.log('❌ no SSL failed:', e.message);
    pool.end();

    // Try with SSL
    const pool2 = new Pool({
      connectionString: process.env.DIRECT_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
    });
    pool2.query('SELECT 1 as ok')
      .then(r => { console.log('✅ Connected (with SSL):', r.rows[0]); pool2.end(); })
      .catch(e2 => { console.log('❌ with SSL failed:', e2.message); pool2.end(); });
  });
