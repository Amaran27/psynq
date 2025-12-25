import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

console.log('TWILIO_ACCOUNT_MAIN_SID:', process.env.TWILIO_ACCOUNT_MAIN_SID);
console.log('TWILIO_AUTH_MAIN_TOKEN:', process.env.TWILIO_AUTH_MAIN_TOKEN);

const ACCOUNT_SID = 'AC60f16ed8d9873295712493d424f27404'; // Use the account SID from previous
const API_KEY_SID = process.env.TWILIO_ACCOUNT_MAIN_SID;
const API_KEY_SECRET = process.env.TWILIO_AUTH_MAIN_TOKEN;

if (!API_KEY_SID || !API_KEY_SECRET) {
  console.error('Missing TWILIO_ACCOUNT_MAIN_SID or TWILIO_AUTH_MAIN_TOKEN');
  process.exit(1);
}

const BASE_URL = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}`;

async function apiCall(endpoint: string, method: string = 'GET', data?: any) {
  const url = `${BASE_URL}${endpoint}.json`;
  const auth = Buffer.from(`${API_KEY_SID}:${API_KEY_SECRET}`).toString('base64');

  const options: any = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (data) {
    const params = new URLSearchParams(data);
    options.body = params.toString();
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API call failed: ${response.status} ${error}`);
  }
  return response.json();
}

async function setupTrunk() {
  try {
    console.log('Checking account access...');
    const account = await apiCall('');
    console.log('Account access OK:', account.friendly_name);

    console.log('Creating Credential List...');
    const credList = await apiCall('/SIP/CredentialLists', 'POST', {
      FriendlyName: 'Psynq-Trunk-Credentials-' + Date.now(),
    });
    console.log('Credential List created:', credList.sid);

    console.log('Adding credentials...');
    const username = 'psynq-user';
    const password = 'SecurePass123!' + Math.random().toString(36).substring(2, 8);
    const cred = await apiCall(`/SIP/CredentialLists/${credList.sid}/Credentials`, 'POST', {
      Username: username,
      Password: password,
    });
    console.log('Credentials added:', cred.username);

    console.log('Creating SIP Trunk...');
    const trunk = await apiCall('/SIP/Trunks', 'POST', {
      FriendlyName: 'Psynq-Trunk',
      CredentialListSid: credList.sid,
    });
    console.log('Trunk created:', trunk.sid);

    const domain = trunk.domain_name || `${trunk.sid}.pstn.twilio.com`;
    console.log('SIP Domain:', domain);

    console.log('\nAdd these to your .env file:');
    console.log(`TWILIO_DOMAIN=${domain}`);
    console.log(`TWILIO_USER=${username}`);
    console.log(`TWILIO_PASS=${password}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

setupTrunk();