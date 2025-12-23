const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'psynq_user',
  password: 'mysecretpassword',
  database: 'psynq_db'
});

client.connect()
  .then(() => {
    console.log('Connected to database');
    return client.query('SELECT 1');
  })
  .then(() => {
    console.log('Query successful');
    client.end();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    client.end();
  });