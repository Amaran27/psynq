// Test with corrected Infobip Voice API endpoints
const apiKey = 'fd18949339bb98d195b61e85b4e1e0eb-320363d0-e084-458f-adf4-78f59ff6a0ab';
const baseUrl = 'https://jr5w1n.api.infobip.com';

console.log('============================================================');
console.log('Testing Correct Infobip Voice API Endpoints');
console.log('============================================================\n');

// Try TTS (Text-to-Speech) Voice Message API
async function makeTTSVoiceMessage() {
  console.log('1️⃣  Making TTS Voice Message Call...\n');
  
  const payload = {
    messages: [
      {
        destinations: [{ to: '918608273468' }],
        from: '38515507799',
        language: 'en',
        text: 'This is a test call from Psynq platform. Please pick up.',
        voice: {
          name: 'Joanna',
          gender: 'female',
        },
      },
    ],
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${baseUrl}/tts/3/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('\nResponse Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Try Click-to-Call with correct payload
async function makeClickToCall() {
  console.log('\n2️⃣  Making Click-to-Call...\n');
  
  const payload = {
    destination: {
      phoneNumber: '918608273468',
      type: 'PHONE',
    },
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${baseUrl}/call-link/1/links`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('\nResponse Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Try Voice Webhook/Interactive Call
async function makeInteractiveCall() {
  console.log('\n3️⃣  Testing Interactive Voice Call with Webhook...\n');
  
  const payload = {
    messages: [
      {
        destination: { to: '918608273468' },
        from: '38515507799',
        language: 'en',
        interactive: {
          callHandling: {
            forwardingUrl: 'https://api.example.com/webhook/voice',
          },
        },
      },
    ],
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${baseUrl}/voice/1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('\nResponse Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function run() {
  await makeTTSVoiceMessage();
  await makeClickToCall();
  await makeInteractiveCall();
  console.log('\n============================================================');
}

run();
