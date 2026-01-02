import AppDataSource from '../data-source';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Provision SIP2SIP Trunk
async function provision() {
  const SIP2SIP_DOMAIN = 'sip2sip.info';
  const SIP2SIP_USER = process.env.sip2sip_username;
  const SIP2SIP_PASS = process.env.sip2sip_password;
  const SIP2SIP_TRUNK_ID = 'sip2sip-trunk';

  if (!SIP2SIP_USER || !SIP2SIP_PASS) {
    console.error('Missing SIP2SIP credentials');
    process.exit(1);
  }

  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();

  console.log(`Provisioning Sip2Sip Trunk: ${SIP2SIP_DOMAIN}`);

  // 1. Create AOR
  await qr.query(
    `
    INSERT INTO ps_aors (id, contact, qualify_frequency)
    VALUES ($1, $2, 30)
    ON CONFLICT (id) DO UPDATE SET contact = $2
  `,
    [SIP2SIP_TRUNK_ID, `sip:${SIP2SIP_DOMAIN}`],
  );

  // 2. Create Auth
  await qr.query(
    `
    INSERT INTO ps_auths (id, auth_type, username, password)
    VALUES ($1, 'userpass', $2, $3)
    ON CONFLICT (id) DO UPDATE SET username = $2, password = $3
  `,
    [`${SIP2SIP_TRUNK_ID}-auth`, SIP2SIP_USER, SIP2SIP_PASS],
  );

  // 3. Create Endpoint (only include columns that exist in current schema)
  await qr.query(
    `
    INSERT INTO ps_endpoints (
        id, transport, aors, auth, context,
        disallow, allow, rewrite_contact, force_rport,
        rtp_symmetric
    ) VALUES (
        $1, 'transport-udp', $2, $3, 'from-webrtc',
        'all', 'ulaw,opus', 'yes', 'yes',
        'yes'
    )
    ON CONFLICT (id) DO UPDATE SET auth = $3
  `,
    [SIP2SIP_TRUNK_ID, SIP2SIP_TRUNK_ID, `${SIP2SIP_TRUNK_ID}-auth`],
  );

  console.log('Sip2Sip Trunk Provisioned successfully.');
  await AppDataSource.destroy();
}

provision().catch(console.error);
