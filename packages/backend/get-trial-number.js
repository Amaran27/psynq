// Get a free trial number from Twilio
require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('=== Getting Free Trial Number ===');

async function getTrialNumber() {
  try {
    console.log('\n1. Checking available trial numbers...');
    
    const credentials = Buffer.from(accountSid + ':' + authToken).toString('base64');
    
    // Search for available US numbers (they're usually free for trial)
    const usNumbersResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?VoiceEnabled=true&Limit=5`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    const usNumbers = usNumbersResponse.data.available_phone_numbers;
    
    if (usNumbers.length > 0) {
      console.log(`✅ Found ${usNumbers.length} available US trial numbers:`);
      
      usNumbers.slice(0, 3).forEach((number, index) => {
        console.log(`\n${index + 1}. ${number.phone_number}`);
        console.log(`   Location: ${number.friendly_name}`);
        console.log(`   Voice: ${number.capabilities.voice ? '✅' : '❌'}`);
        console.log(`   SMS: ${number.capabilities.sms ? '✅' : '❌'}`);
      });
      
      // Try to buy the first number (should be free with trial credit)
      const selectedNumber = usNumbers[0].phone_number;
      console.log(`\n2. Getting free trial number: ${selectedNumber}`);
      
      try {
        const purchaseResponse = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
          new URLSearchParams({
            PhoneNumber: selectedNumber
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${credentials}`
            }
          }
        );

        console.log('✅ Successfully got free trial number!');
        console.log(`   Number: ${purchaseResponse.data.phone_number}`);
        console.log(`   SID: ${purchaseResponse.data.sid}`);
        console.log(`   Capabilities: ${JSON.stringify(purchaseResponse.data.capabilities)}`);
        
        // Update .env file
        const envFile = require('fs').readFileSync('./.env', 'utf8');
        const updatedEnv = envFile.replace(
          /TWILIO_PHONE_NUMBER=.*/,
          `TWILIO_PHONE_NUMBER=${purchaseResponse.data.phone_number}  # Free trial number`
        );
        require('fs').writeFileSync('./.env', updatedEnv);
        
        console.log('\n✅ Updated your .env file with the new trial number');
        console.log('\n3. Now testing call to your mobile...');
        
        // Test the call immediately
        await testCallWithNewNumber(purchaseResponse.data.phone_number);
        
      } catch (purchaseError) {
        console.error('❌ Could not get trial number automatically');
        console.log('\n🔧 Manual steps:');
        console.log('1. Go to https://www.twilio.com/console/phone-numbers/search');
        console.log('2. Search for US numbers');
        console.log('3. Click "Buy this number" (should be free with $15.50 trial credit)');
        console.log('4. Update TWILIO_PHONE_NUMBER in .env file');
        console.log('5. Run: node test-twilio-call.js');
      }
      
    } else {
      console.log('❌ No US numbers available');
      
      // Try UK numbers
      console.log('\n🔄 Trying UK numbers...');
      const ukNumbersResponse = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/GB/Local.json?VoiceEnabled=true&Limit=3`,
        {
          headers: {
            'Authorization': `Basic ${credentials}`
          }
        }
      );
      
      const ukNumbers = ukNumbersResponse.data.available_phone_numbers;
      
      if (ukNumbers.length > 0) {
        console.log(`✅ Found ${ukNumbers.length} available UK trial numbers`);
        console.log('   You can get one of these manually from the Twilio console');
      } else {
        console.log('❌ No UK numbers available either');
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting trial number:', error.message);
    if (error.response?.data?.message) {
      console.error('   Details:', error.response.data.message);
    }
  }
}

async function testCallWithNewNumber(fromNumber) {
  try {
    const credentials = Buffer.from(accountSid + ':' + authToken).toString('base64');
    
    const callResponse = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      new URLSearchParams({
        To: '+918608273468',
        From: fromNumber,
        Twiml: '<Response><Say>Hello from Twilio trial number! This is a test call to see if we can reach Indian mobile numbers.</Say></Response>'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    console.log('\n🎉 CALL INITIATED SUCCESSFULLY!');
    console.log(`   From: ${fromNumber}`);
    console.log(`   To: +918608273468`);
    console.log(`   Call SID: ${callResponse.data.sid}`);
    console.log(`   Status: ${callResponse.data.status}`);
    console.log('\n📱 Check your phone now! If it rings, you\'ve solved the problem!');
    
  } catch (callError) {
    console.error('\n❌ Call failed:');
    if (callError.response) {
      console.error('   Status:', callError.response.status);
      console.error('   Message:', callError.response.data.message);
      
      if (callError.response.data.code === 21614) {
        console.error('\n   This means your number is on DND (like Infobip)');
      }
    }
  }
}

getTrialNumber();