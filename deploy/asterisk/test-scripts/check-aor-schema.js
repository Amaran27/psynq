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

    // Get table schema
    const schema = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'ps_aors'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== PS_AORS Table Schema ===');
    schema.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} ${row.column_default ? `(default: ${row.column_default})` : ''}`);
    });

    // Get current AOR config
    const result = await client.query('SELECT * FROM ps_aors WHERE id = $1', ['sysadmin']);
    console.log('\n=== Current PS_AORS for sysadmin ===');
    console.log(result.rows[0]);

    // Update contact to NULL to allow any contact URI
    await client.query('UPDATE ps_aors SET contact = NULL WHERE id = $1', ['sysadmin']);
    console.log('\n=== Updated contact to NULL (allow any contact) ===');

    // Increase max_contacts
    await client.query('UPDATE ps_aors SET max_contacts = 10 WHERE id = $1', ['sysadmin']);
    console.log('=== Updated max_contacts to 10 ===');

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
