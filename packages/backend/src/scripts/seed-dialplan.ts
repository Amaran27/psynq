import AppDataSource from '../data-source';

async function seed() {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();

  console.log('Seeding Realtime Dialplan...');

  // Clear old dialplan
  await qr.query(`DELETE FROM extensions_data`);

  // 1. Route calls from WebRTC to our backend (Stasis)
  // When an agent dials anything, it enters 'from-webrtc' context.
  // We send it to Stasis('psynq-app')
  await qr.query(`
    INSERT INTO extensions_data (context, exten, priority, app, appdata)
    VALUES ('from-webrtc', '_X.', 1, 'Stasis', 'psynq-app')
  `);

  // 2. Add a test extension (1000) that just plays an announcement
  await qr.query(`
    INSERT INTO extensions_data (context, exten, priority, app, appdata)
    VALUES ('from-webrtc', '1000', 1, 'Answer', ''),
           ('from-webrtc', '1000', 2, 'Playback', 'demo-congrats'),
           ('from-webrtc', '1000', 3, 'Hangup', '')
  `);

  console.log('Dialplan seeded.');
  await AppDataSource.destroy();
}

seed().catch(console.error);
