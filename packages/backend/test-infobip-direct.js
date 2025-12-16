// Direct test to Infobip API to diagnose the issue
const apiKey = 'fd18949339bb98d195b61e85b4e1e0eb-320363d0-e084-458f-adf4-78f59ff6a0ab';
const baseUrl = 'https://jr5w1n.api.infobip.com';

console.log('============================================================');
console.log('Direct Infobip API Test - Check Account & Make Real Call');
console.log('============================================================\n');

// First, check account status
async function checkAccount() {
  console.log('1️⃣  Checking Infobip Account Status...\n');
  
  try {
    const response = await fetch(`${baseUrl}/account/1/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Account Info:', JSON.stringify(data, null, 2));
    } else {
      console.log('Status:', response.status);
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('Error checking account:', error.message);
  }
}

// Try to make actual call using Infobip Click-to-Call API
async function makeCallClickToCall() {
  console.log('\n2️⃣  Making Call via Click-to-Call API...\n');
  
  const payload = {
    destinationA: '918608273468', // Your verified number
    destinationB: '918608273468', // Phone to call
    from: '38515507799',           // Infobip verified number
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${baseUrl}/voice/ctc/1/send`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('\nResponse Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Try standard voice call API
async function makeCallVoiceAPI() {
  console.log('\n3️⃣  Making Call via Standard Voice API...\n');
  
  const payload = {
    from: '38515507799',
    to: '918608273468',
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${baseUrl}/voice/1/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('\nResponse Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function run() {
  await checkAccount();
  await makeCallClickToCall();
  await makeCallVoiceAPI();
  console.log('\n============================================================');
}

run();
