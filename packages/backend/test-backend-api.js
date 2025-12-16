const http = require('http');

// Test the call via our backend API
function testBackendOutboundCall() {
  const postData = JSON.stringify({
    from: '918608273468',
    to: '918608273468',
    agentId: 'test-agent-1'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/calls',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('Testing backend outbound call...');
  console.log(`Making call from: 918608273468 to: 918608273468`);
  
  const req = http.request(options, (res) => {
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
    console.error('Full error:', e);
  });

  req.write(postData);
  req.end();
}

// Run the test
console.log('='.repeat(60));
console.log('Testing Psynq backend API for outbound calls');
console.log('='.repeat(60));

testBackendOutboundCall();