// Test your actual backend API with real Twilio integration
require('dotenv').config();
const axios = require('axios');

console.log('=== Test Backend API with Real Telephony ===');
console.log('This will test your backend API which should use Twilio to call your mobile');

const backendUrl = 'http://localhost:3000';

// Test call data that matches your API
const testCall = {
  from: process.env.TWILIO_PHONE_NUMBER || '+12706481767', // US Twilio number
  to: '+918608273468', // Your mobile
  agentId: 'agent_001'
};

console.log('\nCall Details:');
console.log('From:', testCall.from);
console.log('To:', testCall.to);
console.log('Agent:', testCall.agentId);
console.log('');

async function testBackendAPI() {
  try {
    console.log('🔌 Calling your backend API...');
    
    const response = await axios.post(`${backendUrl}/calls`, testCall, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Backend API call successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Check if the call was created
    if (response.data.id) {
      console.log('\n🔍 Checking call status...');
      const callId = response.data.id;
      
      // Poll for call status
      let status = response.data.state;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (status === 'ringing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        attempts++;
        
        try {
          const statusResponse = await axios.get(`${backendUrl}/calls/${callId}`);
          status = statusResponse.data.state;
          console.log(`   Attempt ${attempts}: Status = ${status}`);
          
          if (status === 'answered') {
            console.log('🎉 Call answered successfully!');
            break;
          } else if (status === 'ended') {
            console.log('📞 Call ended');
            break;
          }
        } catch (error) {
          console.log(`   Attempt ${attempts}: Could not get status`);
        }
      }
      
      console.log('\n📱 Your phone should be ringing now!');
      console.log('Please check if you receive a call from:', testCall.from);
    }
    
  } catch (error) {
    console.error('❌ Backend API test failed:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - make sure your backend is running on port 3000');
      console.error('Run: npm start');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testBackendAPI();