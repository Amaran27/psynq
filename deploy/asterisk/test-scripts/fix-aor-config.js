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

    // Get current AOR config
    const result = await client.query('SELECT * FROM ps_aors WHERE id = $1', ['sysadmin']);
    console.log('\n=== Current PS_AORS for sysadmin ===');
    console.log(result.rows[0]);

    // Update to be more permissive for WebSocket contacts
    await client.query(`
      UPDATE ps_aors 
      SET 
        remove_existing = $1,
        max_contacts = $2,
        qualify_frequency = $3,
        contact = $4
      WHERE id = 'sysadmin'
    `, [false, 10, 0, null]);

    console.log('\n=== Updated PS_AORS ===');
    console.log('Set remove_existing = false');
    console.log('Set max_contacts = 10');
    console.log('Set qualify_frequency = 0');
    console.log('Set contact = NULL (allow any contact)');

    // Verify the update
    const updated = await client.query('SELECT * FROM ps_aors WHERE id = $1', ['sysadmin']);
    console.log('\n=== New Configuration ===');
    console.log(updated.rows[0]);
  })
  .catch(err => {
    console.error('Error:', err.message);
  })
  .finally(() => {
    client.end();
  });
