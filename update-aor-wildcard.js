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

    // Set contact to a wildcard pattern that accepts any contact
    // The syntax is: contact: <sip URI> or NULL
    // For Asterisk PJSIP, we can use a pattern with just the domain
    
    await client.query(`
      UPDATE ps_aors 
      SET 
        contact = $1,
        qualify_frequency = 0,
        max_contacts = 10
      WHERE id = 'sysadmin'
    `, ['sip:sysadmin@*']);

    console.log('Set contact to sip:sysadmin@* (accept any IP)');
    console.log('Set max_contacts to 10');
    console.log('Set qualify_frequency to 0');

    // Verify the update
    const result = await client.query('SELECT * FROM ps_aors WHERE id = $1', ['sysadmin']);
    console.log('\n=== Updated Configuration ===');
    console.log(result.rows[0]);
  })
  .catch(err => {
    console.error('Error:', err.message);
  })
  .finally(() => {
    client.end();
  });
