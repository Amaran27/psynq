// Simple test to check if Twilio trial account can call your mobile number
require('dotenv').config();
const axios = require('axios');

// Your Twilio credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Your mobile number (from previous Infobip tests)
const toNumber = '+918608273468';

// Test message
const testMessage = 'Hello from Twilio test call';

console.log('=== Twilio Direct API Call Test ===');
console.log('Account SID:', accountSid ? 'Set' : 'Not set');
console.log('Auth Token:', authToken ? 'Set' : 'Not set');
console.log('From Number:', fromNumber);
console.log('To Number:', toNumber);
console.log('');

if (!accountSid || !authToken || !fromNumber) {
  console.error('Error: Missing Twilio credentials in .env file');
  console.log('Please ensure the following are set:');
  console.log('- TWILIO_ACCOUNT_SID');
  console.log('- TWILIO_AUTH_TOKEN');
  console.log('- TWILIO_PHONE_NUMBER');
  process.exit(1);
}

async function makeTwilioCall() {
  try {
    console.log('Making call via Twilio REST API...');
    
    // Convert credentials to Base64 for Basic Auth
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Twiml: `<Response><Say>${testMessage}</Say></Response>`,
        // Optional: Set machine detection to help with DND
        MachineDetection: 'Enable',
        MachineDetectionTimeout: 3000
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    console.log('✅ Call initiated successfully!');
    console.log('Call SID:', response.data.sid);
    console.log('Status:', response.data.status);
    console.log('Date created:', response.data.date_created);
    console.log('');
    console.log('Please check if your phone rings!');
    console.log('If not, the call might be blocked by DND restrictions like Infobip.');
    
  } catch (error) {
    console.error('❌ Failed to make call via Twilio:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message);
      console.error('Code:', error.response.data.code);
      
      if (error.response.data.code === 21614) {
        console.error('');
        console.error('🔍 This is a "To number is incapable of receiving SMS" error.');
        console.error('   For voice calls, this often means the number is on DND.');
      } else if (error.response.data.code === 21211) {
        console.error('');
        console.error('🔍 This is an "Invalid To number" error.');
        console.error('   Check if the phone number format is correct.');
      } else if (error.response.data.code === 20003) {
        console.error('');
        console.error('🔍 This is an "Authentication Error".');
        console.error('   Check your Account SID and Auth Token.');
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

makeTwilioCall();