const https = require('https');
const querystring = require('querystring');

// Test Infobip API directly
function testInfobipOutboundCall() {
  const apiKey = 'YOUR_REAL_API_KEY_HERE'; // Replace with actual API key from Infobip
  const phoneNumber = '918608273468';
  const infobipNumber = '38515507799';
  
  const postData = JSON.stringify({
    from: infobipNumber,
    to: phoneNumber
  });

  const options = {
    hostname: 'api.infobip.com',
    port: 443,
    path: '/voice/1/calls',
    method: 'POST',
    headers: {
      'Authorization': `App ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('Testing Infobip outbound call...');
  console.log(`From: ${infobipNumber} To: ${phoneNumber}`);
  
  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ SUCCESS: Infobip call initiated successfully!');
      } else {
        console.log('❌ ERROR: Failed to initiate Infobip call');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ ERROR: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

// Test the call via our backend API
function testBackendOutboundCall() {
  const postData = JSON.stringify({
    from: '918608273468',
    to: '918608273468',
    agentId: 'test-agent-1'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/calls',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('\n\nTesting backend outbound call...');
  
  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', data);
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ SUCCESS: Backend call initiated successfully!');
      } else {
        console.log('❌ ERROR: Failed to initiate backend call');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ ERROR: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

// Run tests
console.log('='.repeat(60));
console.log('Testing Infobip integration for Psynq');
console.log('='.repeat(60));

// Test 1: Direct Infobip API
testInfobipOutboundCall();

// Test 2: Backend API (wait 2 seconds)
setTimeout(testBackendOutboundCall, 2000);