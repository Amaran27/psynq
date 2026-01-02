import AppDataSource from '../data-source';

/**
 * Create missing Asterisk realtime tables
 */
async function createTables() {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();

  console.log('Creating missing Asterisk realtime tables...');

  // Create ps_transports_data
  await qr.query(`
    CREATE TABLE IF NOT EXISTS "ps_transports_data" (
      "id" TEXT PRIMARY KEY,
      "protocol" TEXT,
      "bind" TEXT,
      "allow_reload" TEXT,
      "tos" TEXT,
      "cos" INTEGER,
      "webrtc" TEXT
    )
  `);

  console.log('Tables created successfully.');
  await AppDataSource.destroy();
}

createTables().catch(console.error);
