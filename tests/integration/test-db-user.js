const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'psynq_user',
  password: 'mysecretpassword',
  database: 'psynq_db'
});

client.connect()
  .then(() => {
    console.log('Connected to database');
    return client.query('SELECT id, username, roles FROM users WHERE username = $1', ['sysadmin']);
  })
  .then(result => {
    console.log('Users found:', result.rows.length);
    console.log('User:', JSON.stringify(result.rows[0], null, 2));
  })
  .catch(err => {
    console.error('Error:', err.message);
  })
  .finally(() => {
    client.end();
  });
