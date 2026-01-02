import AppDataSource from '../data-source';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * PROVISION TWILIO SIP TRUNK
 * This script sets up Twilio as a SIP Provider in Asterisk Realtime.
 */
async function provision() {
  // CONFIGURATION - Read from environment variables
  const TWILIO_DOMAIN = process.env.TWILIO_DOMAIN;
  const TWILIO_USER = process.env.TWILIO_USER;
  const TWILIO_PASS = process.env.TWILIO_PASS;
  const TWILIO_TRUNK_ID = process.env.TWILIO_TRUNK_ID || 'twilio-trunk';

  if (!TWILIO_DOMAIN || !TWILIO_USER || !TWILIO_PASS) {
    console.error(
      'Missing required environment variables: TWILIO_DOMAIN, TWILIO_USER, TWILIO_PASS',
    );
    process.exit(1);
  }

  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();

  console.log(`Provisioning Twilio Trunk: ${TWILIO_DOMAIN}`);

  // 1. Create Transport for WebRTC
  await qr.query(`
    INSERT INTO ps_transports_data (id, protocol, bind, allow_reload, tos, cos, webrtc)
    VALUES ('transport-ws', 'wss', '0.0.0.0:8089', 'yes', 'cs4', '5', 'yes')
    ON CONFLICT (id) DO UPDATE SET protocol = 'wss', bind = '0.0.0.0:8089', webrtc = 'yes'
  `);

  // 2. Create Transport for UDP
  await qr.query(`
    INSERT INTO ps_transports_data (id, protocol, bind, allow_reload, tos, cos)
    VALUES ('transport-udp', 'udp', '0.0.0.0:5060', 'yes', 'cs4', '5')
    ON CONFLICT (id) DO UPDATE SET protocol = 'udp', bind = '0.0.0.0:5060'
  `);

  // 3. Create AOR (Address of Record) - Points to Twilio's server
  await qr.query(
    `
    INSERT INTO ps_aors_data (id, contact, qualify_frequency)
    VALUES ($1, $2, 30)
    ON CONFLICT (id) DO UPDATE SET contact = $2
  `,
    [TWILIO_TRUNK_ID, `sip:${TWILIO_DOMAIN}`],
  );

  // 4. Create Auth - Your Twilio SIP Credentials
  await qr.query(
    `
    INSERT INTO ps_auths_data (id, auth_type, username, password)
    VALUES ($1, 'userpass', $2, $3)
    ON CONFLICT (id) DO UPDATE SET username = $2, password = $3
  `,
    [`${TWILIO_TRUNK_ID}-auth`, TWILIO_USER, TWILIO_PASS],
  );

  // 5. Create Endpoint - The bridge between Asterisk and Twilio
  await qr.query(
    `
    INSERT INTO ps_endpoints_data (
        id, transport, aors, outbound_auth, context, 
        disallow, allow, rewrite_contact, force_rport, 
        rtp_symmetric, from_user, from_domain
    ) VALUES (
        $1, 'transport-udp', $2, $3, 'from-twilio',
        'all', 'ulaw', 'yes', 'yes', 
        'yes', $4, $5
    )
    ON CONFLICT (id) DO UPDATE SET outbound_auth = $3
  `,
    [
      TWILIO_TRUNK_ID,
      TWILIO_TRUNK_ID,
      `${TWILIO_TRUNK_ID}-auth`,
      TWILIO_USER,
      TWILIO_DOMAIN,
    ],
  );

  // 6. Create Identify - Crucial for INBOUND calls
  // This matches calls coming from Twilio's IP ranges to the 'twilio-trunk' endpoint
  // Note: Twilio uses many IPs, but usually matching the domain works for basic setups
  await qr.query(
    `
    INSERT INTO ps_identifies_data (id, endpoint, match)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE SET match = $3
  `,
    [`${TWILIO_TRUNK_ID}-identify`, TWILIO_TRUNK_ID, TWILIO_DOMAIN],
  );

  console.log('Twilio Trunk Provisioned successfully.');
  await AppDataSource.destroy();
}

provision().catch(console.error);
