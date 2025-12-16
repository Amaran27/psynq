// Test if you can call a US number (which should work with Indian numbers)
require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('=== Test Call to US Number ===');
console.log('This will test if Twilio can call Indian numbers from a US number');

if (!accountSid || !authToken) {
  console.error('Error: Missing Twilio credentials in .env file');
  process.exit(1);
}

async function testUSCall() {
  try {
    console.log('\n1. First, let\'s see what US numbers are available to buy...');
    
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    // Search for available US numbers
    const availableResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?VoiceEnabled=true&Limit=3`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    const availableNumbers = availableResponse.data.available_phone_numbers;
    
    if (availableNumbers.length === 0) {
      console.log('❌ No US numbers available right now');
      return;
    }
    
    console.log(`✅ Found ${availableNumbers.length} available US number(s):`);
    availableNumbers.forEach((number, index) => {
      console.log(`   ${index + 1}. ${number.phone_number} in ${number.friendly_name}`);
    });
    
    // Buy the first available number
    const numberToBuy = availableNumbers[0].phone_number;
    console.log(`\n2. Buying number: ${numberToBuy}`);
    
    const buyResponse = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      new URLSearchParams({
        PhoneNumber: numberToBuy
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );
    
    console.log('✅ Successfully purchased US number!');
    console.log(`   New number: ${buyResponse.data.phone_number}`);
    
    // Now test calling your Indian number from this US number
    console.log('\n3. Testing call to your Indian number...');
    
    const callResponse = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      new URLSearchParams({
        To: '+918608273468',
        From: buyResponse.data.phone_number,
        Twiml: '<Response><Say>Hello from Twilio US number test call</Say></Response>'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    console.log('✅ Call initiated from US number to your Indian number!');
    console.log(`   Call SID: ${callResponse.data.sid}`);
    console.log(`   Status: ${callResponse.data.status}`);
    console.log('\n📱 Please check if your phone rings now!');
    
    // Update .env with the new number
    const envFile = require('fs').readFileSync('./.env', 'utf8');
    const updatedEnv = envFile.replace(
      /TWILIO_PHONE_NUMBER=.*/,
      `TWILIO_PHONE_NUMBER=${buyResponse.data.phone_number}  # US number purchased for testing`
    );
    require('fs').writeFileSync('./.env', updatedEnv);
    
    console.log('\n✅ Updated your .env file with the new US number');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      if (error.response.data) {
        console.error('Message:', error.response.data.message);
        if (error.response.data.code) {
          console.error('Code:', error.response.data.code);
        }
      }
    }
    
    if (error.response?.status === 429) {
      console.log('\n⚠️ This might be a trial account limitation');
    }
  }
}

// Check for confirmation flag
const shouldConfirm = process.argv.includes('--confirm');

if (!shouldConfirm) {
  console.log('\n⚠️ This will purchase a US phone number (costs ~$1/month).');
  console.log('   If you want to proceed, run: node test-us-number.js --confirm');
  console.log('   If not, just cancel with Ctrl+C');
  process.exit(0);
}

console.log('\n✅ Confirmation received. Proceeding with purchase...');