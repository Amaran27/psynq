import AppDataSource from '../data-source';

async function updateDialplan() {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();

  console.log('Updating Dialplan for Twilio Routing...');

  // 1. Rule for WebRTC agents dialing OUT (+ country code)
  // We dial via the twilio-trunk endpoint
  await qr.query(`
    INSERT INTO extensions_data (context, exten, priority, app, appdata)
    VALUES ('from-webrtc', '_+.', 1, 'Dial', 'PJSIP/${'${EXTEN}'}@twilio-trunk')
    ON CONFLICT DO NOTHING
  `);

  // 2. Rule for INCOMING calls from Twilio
  // For now, we send them to our Stasis app (psynq-app)
  await qr.query(`
    INSERT INTO extensions_data (context, exten, priority, app, appdata)
    VALUES ('from-twilio', '_X.', 1, 'Stasis', 'psynq-app')
    ON CONFLICT DO NOTHING
  `);

  console.log('Dialplan updated.');
  await AppDataSource.destroy();
}

updateDialplan().catch(console.error);
