const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'psynq_user',
  password: 'mysecretpassword',
  database: 'psynq_db'
});

const username = 'sysadmin';
const password = 'PsynqSecure2025!!';

client.connect()
  .then(async () => {
    console.log('Connected to database');

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the user with the hashed password
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, roles',
      [hashedPassword, username]
    );

    console.log('User updated:', result.rows.length);
    console.log('User:', JSON.stringify(result.rows[0], null, 2));
  })
  .catch(err => {
    console.error('Error:', err.message);
  })
  .finally(() => {
    client.end();
  });
