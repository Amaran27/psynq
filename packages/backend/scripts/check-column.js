const { Client } = require('pg');
(async () => {
  const client = new Client({
    user: process.env.DB_USER || 'psynq_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'psynq_db',
    password: process.env.DB_PASSWORD || 'mysecretpassword',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  });

  try {
    await client.connect();
    const res = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='calls' AND column_name='supervisorParticipantSid'",
    );
    console.log('Query result rows:', res.rows);
    if (res.rows.length > 0) {
      console.log('Column supervisorParticipantSid exists in calls table ✅');
      process.exit(0);
    }
    console.log('Column NOT found');
    process.exit(2);
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
