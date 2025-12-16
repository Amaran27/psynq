// Simple test to check Twilio trial capabilities
require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('=== Simple Twilio Trial Test ===');

// First test - can we make any API calls?
async function testAccount() {
  try {
    console.log('\n1. Testing Twilio account access...');
    
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    console.log('✅ Account access successful!');
    console.log('   Account SID:', response.data.sid);
    console.log('   Status:', response.data.status);
    console.log('   Type:', response.data.type);
    console.log('   Date Created:', response.data.date_created);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Account access failed:', error.message);
    if (error.response?.data?.message) {
      console.error('   Details:', error.response.data.message);
    }
    return null;
  }
}

// Test account and provide recommendations
async function main() {
  const account = await testAccount();
  
  if (!account) {
    console.log('\n🔧 Fix your Twilio credentials in .env file and try again.');
    return;
  }
  
  console.log('\n2. Current limitations:');
  console.log('   ❌ Cannot use Indian numbers (+91) as caller ID');
  console.log('   ❌ No phone numbers in account yet');
  console.log('   ✅ Can make calls from non-Indian numbers');
  
  console.log('\n3. Options to test calling your mobile:');
  console.log('   1. Buy a US/UK number (~$1) and test calling +918608273468');
  console.log('   2. Use Infobip (API works but your number is on DND)');
  console.log('   3. Try other providers like Vonage or Plivo');
  
  console.log('\n4. To proceed with option 1:');
  console.log('   - Go to https://www.twilio.com/console/phone-numbers/search');
  console.log('   - Buy any US or UK number with voice capability');
  console.log('   - Update TWILIO_PHONE_NUMBER in .env');
  console.log('   - Run: node test-twilio-call.js');
}

main();