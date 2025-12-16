// Check for trial numbers in your Twilio account
require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('=== Checking Twilio Trial Numbers ===');

async function checkTrialCapabilities() {
  try {
    console.log('\n1. Checking your trial account capabilities...');
    
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    // Get account details
    const accountResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    console.log('✅ Account Status:', accountResponse.data.status);
    console.log('   Type:', accountResponse.data.type);
    
    // Check trial phone numbers
    const numbersResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    const trialNumbers = numbersResponse.data.incoming_phone_numbers;
    
    if (trialNumbers.length === 0) {
      console.log('\n❌ No trial numbers found in your account');
      console.log('\n🔍 Checking what trial numbers Twilio typically provides...');
      
      // Twilio usually provides one trial number during signup
      console.log('\n💡 Twilio Trial Account Benefits:');
      console.log('   - $15.50 free credit to use for testing');
      console.log('   - Typically includes 1 trial Twilio phone number');
      console.log('   - Can make calls to verified numbers');
      console.log('\n📝 To get your trial number:');
      console.log('   1. Go to https://www.twilio.com/console');
      console.log('   2. Look for "Get a trial number" or "Buy a number"');
      console.log('   3. Choose any US/UK number (they come with $15.50 credit)');
      
      // Alternative approach - check if we can verify your number
      console.log('\n🔄 Alternative: Verify your number');
      console.log('   Twilio trial accounts can call verified numbers');
      console.log('   Let\'s try to verify your number first...');
      
      try {
        const verifyResponse = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/OutgoingCallerIds.json`,
          new URLSearchParams({
            PhoneNumber: '+918608273468',
            FriendlyName: 'My Mobile Test Number'
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${credentials}`
            }
          }
        );
        
        console.log('✅ Number verification initiated!');
        console.log('   Status:', verifyResponse.data.status);
        console.log('   You should receive a verification call/SMS');
        
      } catch (verifyError) {
        console.log('❌ Could not verify number automatically');
        if (verifyError.response?.data?.message) {
          console.log('   Reason:', verifyError.response.data.message);
        }
      }
      
    } else {
      console.log(`\n✅ Found ${trialNumbers.length} number(s) in your account:`);
      
      trialNumbers.forEach((number, index) => {
        console.log(`\n${index + 1}. Number: ${number.phone_number}`);
        console.log(`   Country: ${number.iso_country || 'Unknown'}`);
        console.log(`   Capabilities: Voice=${number.capabilities.voice}, SMS=${number.capabilities.sms}`);
        console.log(`   Can make calls: ${number.capabilities.voice ? 'Yes' : 'No'}`);
        
        // If it has voice capability, suggest using it
        if (number.capabilities.voice) {
          console.log(`   ✅ This number can call your mobile!`);
          console.log(`   Update your .env file with: TWILIO_PHONE_NUMBER=${number.phone_number}`);
        }
      });
    }
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('1. Trial accounts come with $15.50 credit');
    console.log('2. You need a Twilio phone number (not your mobile) to make calls');
    console.log('3. Trial numbers can call Indian mobile numbers (if not Indian origin)');
    console.log('4. You can verify your number to receive calls even on trial');
    
  } catch (error) {
    console.error('❌ Error checking trial numbers:', error.message);
    if (error.response?.data?.message) {
      console.error('   Details:', error.response.data.message);
    }
  }
}

checkTrialCapabilities();