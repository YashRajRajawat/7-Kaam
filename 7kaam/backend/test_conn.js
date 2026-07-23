require('dotenv').config();
const { Pool } = require('pg');

// Test with explicit params instead of connection string
const pool = new Pool({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.qywflwdkrckyjdrsadvo',
  password: 'Yazugrang30@',
  ssl: false,  // Try without SSL first
  connectionTimeoutMillis: 12000,
});

pool.query('SELECT 1 as ok')
  .then(r => { console.log('✅ Connected (no SSL):', r.rows[0]); pool.end(); })
  .catch(e => {
    console.log('❌ no SSL failed:', e.message);
    pool.end();
    
    // Try with SSL
    const pool2 = new Pool({
      host: 'aws-0-ap-south-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.qywflwdkrckyjdrsadvo',
      password: 'Yazugrang30@',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
    });
    pool2.query('SELECT 1 as ok')
      .then(r => { console.log('✅ Connected (with SSL):', r.rows[0]); pool2.end(); })
      .catch(e2 => { console.log('❌ with SSL failed:', e2.message); pool2.end(); });
  });
