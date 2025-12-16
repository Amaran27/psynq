// Search for DND whitelist and number verification APIs in Infobip
const apiKey = 'fd18949339bb98d195b61e85b4e1e0eb-320363d0-e084-458f-adf4-78f59ff6a0ab';
const baseUrl = 'https://jr5w1n.api.infobip.com';

console.log('============================================================');
console.log('Testing Infobip DND/Number Verification APIs');
console.log('============================================================\n');

// Check if there are DND management endpoints
async function testDNDEndpoints() {
  console.log('1️⃣  Testing DND/Whitelist endpoints...\n');
  
  const endpoints = [
    '/numbers/1/whitelist',
    '/numbers/1/verified-numbers', 
    '/dnd/1/whitelist',
    '/ndnd/1/whitelist',
    '/sender/1/verification',
    '/numbers/1/verify',
    '/numbers/2/whitelist',
    '/numbers/2/verified-numbers'
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing GET ${endpoint}`);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `App ${apiKey}`,
          'Accept': 'application/json',
        },
      });

      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ SUCCESS: Found endpoint!`);
        console.log(`  Response:`, JSON.stringify(data, null, 2));
        
        // Try to add number to whitelist
        if (Array.isArray(data.results) || data.results) {
          console.log(`\n  Trying to add 918608273468 to whitelist...`);
          
          try {
            const postResponse = await fetch(`${baseUrl}${endpoint}`, {
              method: 'POST',
              headers: {
                'Authorization': `App ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                phoneNumber: '918608273468',
                country: 'IN',
                reason: 'TESTING'
              }),
            });

            console.log(`  POST Status: ${postResponse.status}`);
            const postData = await postResponse.text();
            console.log(`  POST Response: ${postData}`);
          } catch (postError) {
            console.log(`  POST Error: ${postError.message}`);
          }
        }
      } else if (response.status === 404) {
        console.log(`  ❌ Not found`);
      } else {
        console.log(`  ⚠️  Error: ${await response.text()}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

// Test number verification
async function testNumberVerification() {
  console.log('2️⃣  Testing number verification endpoints...\n');
  
  const endpoints = [
    '/numbers/1/verify',
    '/numbers/2/verify',
    '/verification/1/number',
    '/sms/2/verify'
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing POST ${endpoint}`);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `App ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: '918608273468',
          from: '38515507799'
        }),
      });

      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ SUCCESS: ${JSON.stringify(data, null, 2)}`);
      } else {
        console.log(`  ❌ Error: ${await response.text()}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

// Check account numbers
async function checkAccountNumbers() {
  console.log('3️⃣  Checking account numbers management...\n');
  
  try {
    // Check all available numbers
    const response = await fetch(`${baseUrl}/numbers/1`, {
      method: 'GET',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    console.log(`Numbers API Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Available Numbers:', JSON.stringify(data, null, 2));
      
      // Look for any whitelisting or verification options
      if (data.results && Array.isArray(data.results)) {
        for (const result of data.results) {
          console.log(`\nNumber: ${result.number || result.phone}`);
          console.log(`Type: ${result.type}`);
          console.log(`Capabilities: ${JSON.stringify(result.capabilities || result.features)}`);
        }
      }
    } else {
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Check if there's a settings API
async function checkAccountSettings() {
  console.log('\n4️⃣  Checking account settings for DND...\n');
  
  const endpoints = [
    '/account/1/settings',
    '/account/1/profile',
    '/channels/1/voice/settings',
    '/voice/1/settings'
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing GET ${endpoint}`);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `App ${apiKey}`,
          'Accept': 'application/json',
        },
      });

      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  Response:`, JSON.stringify(data, null, 2));
        
        // Look for DND-related settings
        const jsonStr = JSON.stringify(data).toLowerCase();
        if (jsonStr.includes('dnd') || jsonStr.includes('whitelist') || jsonStr.includes('ndnd')) {
          console.log(`  🎯 Found DND/Whitelist settings!`);
        }
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    console.log('');
  }
}

async function run() {
  await testDNDEndpoints();
  await testNumberVerification();
  await checkAccountNumbers();
  await checkAccountSettings();
  console.log('\n============================================================');
  console.log('CONCLUSION:');
  console.log('If no whitelist API found, you need to:');
  console.log('1. Contact Infobip support');
  console.log('2. Use their UI to verify numbers');
  console.log('3. Or try a different (non-DND) test number');
  console.log('============================================================');
}

run();