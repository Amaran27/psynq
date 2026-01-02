const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'psynq_user',
  password: 'mysecretpassword',
  database: 'psynq_db'
});

client.connect()
  .then(async () => {
    console.log('Connected to database');

    // Check ps_aors
    const aors = await client.query('SELECT * FROM ps_aors WHERE id = $1', ['sysadmin']);
    console.log('\n=== PS_AORS ===');
    console.log(aors.rows[0]);

    // Check ps_endpoints
    const endpoints = await client.query('SELECT id, transport, aors, auth, context FROM ps_endpoints WHERE id = $1', ['sysadmin']);
    console.log('\n=== PS_ENDPOINTS ===');
    console.log(endpoints.rows[0]);

    // Check ps_auths
    const auths = await client.query('SELECT id, auth_type, username FROM ps_auths WHERE id = $1', ['sysadmin']);
    console.log('\n=== PS_AUTHS ===');
    console.log(auths.rows[0]);
  })
  .catch(err => {
    console.error('Error:', err.message);
  })
  .finally(() => {
    client.end();
  });
