const axios = require('axios');

// Test outbound call through our backend with Infobip
async function testInfobipCall() {
  console.log('============================================================');
  console.log('Testing Infobip outbound call with different numbers');
  console.log('============================================================');
  
  try {
    // Make call from Infobip number to your mobile
    // Use your verified Infobip number as 'from' and a different number as 'to'
    const callData = {
      from: "38515507799",  // Your Infobip verified number
      to: "918608273468",   // Your mobile number (destination)
      agentId: "test-agent-1"
    };
    
    console.log(`Making call from: ${callData.from} to: ${callData.to}`);
    
    const response = await axios.post('http://localhost:3000/calls', callData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    console.log('✅ SUCCESS: Call initiated via Infobip!');
    
    // Check call status after a few seconds
    if (response.data.id) {
      console.log('\nChecking call status...');
      setTimeout(async () => {
        try {
          const statusResponse = await axios.get(`http://localhost:3000/calls/${response.data.id}`);
          console.log(`Call status: ${JSON.stringify(statusResponse.data, null, 2)}`);
        } catch (error) {
          console.log(`Could not get call status: ${error.message}`);
        }
      }, 5000);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testInfobipCall();