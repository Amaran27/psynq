// Test with longer ring time and better message
require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = '+918608273468';

console.log('=== Long Ring Test - 30 seconds ===');
console.log('From:', fromNumber);
console.log('To:', toNumber);
console.log('This will ring for 30 seconds. Please answer!');
console.log('');

async function makeLongRingCall() {
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Twiml: `<Response>
          <Say voice="alice">Hello from Psynq! This is a test call to confirm our telephony integration is working. Please stay on the line.</Say>
          <Pause length="5"/>
          <Say>This call will continue for another 20 seconds to confirm connectivity.</Say>
          <Pause length="20"/>
          <Say>Thank you! Test complete. Goodbye.</Say>
        </Response>`,
        Timeout: 30  // Ring for 30 seconds before giving up
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    console.log('✅ Call initiated!');
    console.log('Call SID:', response.data.sid);
    console.log('Status:', response.data.status);
    console.log('');
    console.log('🔔 Your phone should ring for 30 seconds...');
    console.log('   Please answer to confirm you can hear the message!');
    
  } catch (error) {
    console.error('❌ Failed to make call:', error.message);
  }
}

makeLongRingCall();