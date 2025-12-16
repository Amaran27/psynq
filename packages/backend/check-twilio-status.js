// Check status of recent Twilio calls
require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('=== Twilio Call Status Check ===');

async function checkRecentCalls() {
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=3`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    const calls = response.data.calls;
    
    if (calls.length === 0) {
      console.log('No recent calls found');
      return;
    }
    
    console.log('\nRecent Calls:');
    calls.forEach((call, index) => {
      console.log(`\n${index + 1}. Call SID: ${call.sid}`);
      console.log(`   To: ${call.to}`);
      console.log(`   From: ${call.from}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Duration: ${call.duration} seconds`);
      console.log(`   Created: ${call.date_created}`);
      
      if (call.status === 'busy') {
        console.log(`   📱 Phone rang but was busy (good sign - it's not blocked!)`);
      } else if (call.status === 'completed') {
        console.log(`   ✅ Call completed successfully!`);
      } else if (call.status === 'failed') {
        console.log(`   ❌ Call failed: ${call.error_code || 'Unknown error'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to check call status:', error.message);
  }
}

checkRecentCalls();