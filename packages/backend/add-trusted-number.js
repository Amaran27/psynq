// Add number to Infobip Trusted MSISDN list to bypass DND
const apiKey = 'fd18949339bb98d195b61e85b4e1e0eb-320363d0-e084-458f-adf4-78f59ff6a0ab';
const baseUrl = 'https://jr5w1n.api.infobip.com';

console.log('============================================================');
console.log('Adding number to Infobip Trusted MSISDN list');
console.log('============================================================\n');

// Add number to trusted list
async function addToTrustedList() {
  console.log('Adding 918608273468 to trusted MSISDN list...\n');
  
  try {
    const response = await fetch(`${baseUrl}/signals/1/trusted-msisdns`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        phoneNumbers: [
          '918608273468'
        ]
      }),
    });

    console.log(`Response Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS: Number added to trusted list!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Error:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Check if number is in trusted list
async function checkTrustedList() {
  console.log('\nChecking if number is in trusted list...\n');
  
  try {
    const response = await fetch(`${baseUrl}/signals/1/trusted-msisdns?phoneNumbers=918608273468`, {
      method: 'GET',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    console.log(`Response Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Trusted List Status:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test call after adding to trusted list
async function testCallAfterWhitelist() {
  console.log('\nTesting call after adding to trusted list...\n');
  
  try {
    const payload = {
      messages: [
        {
          destinations: [{ to: '918608273468' }],
          from: '38515507799',
          language: 'en',
          text: 'Test call from Psynq after DND whitelist. This should work now!',
          voice: {
            name: 'Joanna',
            gender: 'female',
          },
        },
      ],
    };

    const response = await fetch(`${baseUrl}/tts/3/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`Call Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Call initiated!');
      console.log('Message ID:', data.messages?.[0]?.messageId);
      console.log('Status:', data.messages?.[0]?.status?.name);
      
      // Wait a moment and check status
      setTimeout(async () => {
        console.log('\nChecking call status after 3 seconds...');
        const messageId = data.messages?.[0]?.messageId;
        if (messageId) {
          try {
            const statusResponse = await fetch(`${baseUrl}/tts/3/reports?messageId=${messageId}`, {
              method: 'GET',
              headers: {
                'Authorization': `App ${apiKey}`,
                'Accept': 'application/json',
              },
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log('Call Status:', JSON.stringify(statusData.results?.[0]?.status, null, 2));
              
              if (statusData.results?.[0]?.status?.name === 'DELIVERED') {
                console.log('🎉 SUCCESS! Call should be delivered to your phone now!');
              } else if (statusData.results?.[0]?.error) {
                console.log('Still failing:', statusData.results[0].error.description);
              }
            }
          } catch (error) {
            console.error('Status check error:', error.message);
          }
        }
      }, 3000);
    } else {
      console.log('❌ Call failed:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function run() {
  await addToTrustedList();
  await checkTrustedList();
  await testCallAfterWhitelist();
  
  console.log('\n============================================================');
  console.log('WHY OTHER PROVIDERS CAN CALL YOU:');
  console.log('1. They have your number in their own trusted/whitelisted database');
  console.log('2. They use different routing that bypasses DND checks');
  console.log('3. They have commercial agreements with Indian carriers');
  console.log('4. They use transactional SMS vs promotional routing');
  console.log('5. Their numbers might be registered differently with carriers');
  console.log('============================================================');
}

run();