const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'psynq',
  user: 'psynq',
  password: 'psynq'
});

(async () => {
  const client = await pool.connect();

  console.log('\n=== Current PJSIP AOR Configuration ===\n');

  // Check sysadmin AOR
  const result = await client.query('SELECT id, max_contacts, remove_existing, contact, qualify_frequency FROM ps_aors WHERE id = $1', ['sysadmin']);
  console.log('sysadmin AOR:');
  console.log(result.rows[0]);

  // Check all AORs for comparison
  const allAors = await client.query('SELECT id, max_contacts, remove_existing, contact, qualify_frequency FROM ps_aors ORDER BY id');
  console.log('\nAll AORs:');
  console.table(allAors.rows);

  client.release();
  pool.end();
})();
