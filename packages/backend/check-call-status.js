// Check the actual delivery status of our Infobip calls
const apiKey = 'fd18949339bb98d195b61e85b4e1e0eb-320363d0-e084-458f-adf4-78f59ff6a0ab';
const baseUrl = 'https://jr5w1n.api.infobip.com';

console.log('============================================================');
console.log('Checking Infobip Call Delivery Status');
console.log('============================================================\n');

// Use the messageId from the last successful call
const messageId = 'f2074aad-746f-425e-9886-e324243db367';
const bulkId = '0b1cc86a-a528-4fb0-9346-e22557c11ea6';

console.log(`Checking message: ${messageId}`);
console.log(`Checking bulkId: ${bulkId}\n`);

// Check individual message status
async function checkMessageStatus() {
  console.log('1️⃣  Checking individual message status...\n');
  
  try {
    const response = await fetch(`${baseUrl}/tts/3/reports?messageId=${messageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    console.log('Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Message Status:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Check bulk status
async function checkBulkStatus() {
  console.log('\n2️⃣  Checking bulk message status...\n');
  
  try {
    const response = await fetch(`${baseUrl}/tts/3/reports?bulkId=${bulkId}`, {
      method: 'GET',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    console.log('Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Bulk Status:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Check account logs for any errors
async function checkAccountLogs() {
  console.log('\n3️⃣  Checking account delivery logs...\n');
  
  try {
    // Try to get recent delivery logs
    const response = await fetch(`${baseUrl}/tts/3/logs`, {
      method: 'GET',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    console.log('Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Account Logs:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Try with different number formats
async function testDifferentFormats() {
  console.log('\n4️⃣  Testing different number formats for India...\n');
  
  const formats = [
    '918608273468',  // Current format
    '+918608273468', // With + prefix
    '00918608273468', // With 00 prefix
    '18608273468',   // Without country code
  ];

  for (const format of formats) {
    console.log(`Testing format: ${format}`);
    
    try {
      const payload = {
        messages: [
          {
            destinations: [{ to: format }],
            from: '38515507799',
            language: 'en',
            text: 'Test call from Psynq. This is a format test.',
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

      console.log(`  Status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`  Message ID: ${data.messages?.[0]?.messageId}`);
        console.log(`  Status: ${data.messages?.[0]?.status?.name}`);
      } else {
        console.log(`  Error: ${await response.text()}`);
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    console.log('');
  }
}

async function run() {
  await checkMessageStatus();
  await checkBulkStatus();
  await checkAccountLogs();
  await testDifferentFormats();
  console.log('\n============================================================');
}

run();
