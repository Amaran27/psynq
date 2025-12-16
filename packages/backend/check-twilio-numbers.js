// Check available Twilio phone numbers in your account
require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('=== Checking Your Twilio Phone Numbers ===');

if (!accountSid || !authToken) {
  console.error('Error: Missing Twilio credentials in .env file');
  process.exit(1);
}

async function checkTwilioNumbers() {
  try {
    console.log('Fetching your Twilio phone numbers...');
    
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    const phoneNumbers = response.data.incoming_phone_numbers;
    
    if (phoneNumbers.length === 0) {
      console.log('❌ No phone numbers found in your Twilio account.');
      console.log('');
      console.log('Options:');
      console.log('1. Buy a Twilio phone number from a non-Indian country (US, UK, etc.)');
      console.log('2. Try the Infobip Trusted MSISDN API approach');
      console.log('3. Consider alternative solutions for Indian DND');
    } else {
      console.log(`✅ Found ${phoneNumbers.length} phone number(s):`);
      console.log('');
      
      phoneNumbers.forEach((number, index) => {
        console.log(`${index + 1}. Phone Number: ${number.phone_number}`);
        console.log(`   Country: ${number.iso_country || 'Unknown'}`);
        console.log(`   Capabilities: Voice=${number.capabilities.voice}, SMS=${number.capabilities.sms}`);
        console.log(`   Date Created: ${number.date_created}`);
        console.log('');
      });
      
      // Suggest using a non-Indian number for testing
      const nonIndianNumbers = phoneNumbers.filter(n => 
        !n.phone_number.startsWith('+91') && 
        n.iso_country !== 'IN' &&
        n.capabilities.voice
      );
      
      if (nonIndianNumbers.length > 0) {
        console.log('💡 Recommendation: Use this number to test calling your mobile:');
        nonIndianNumbers.forEach(n => console.log(`   ${n.phone_number}`));
        
        // Update the test script with the suggested number
        console.log('');
        console.log('Updating test-twilio-call.js with recommended number...');
        
        const testFile = require('fs').readFileSync('./test-twilio-call.js', 'utf8');
        const updatedFile = testFile.replace(
          /TWILIO_PHONE_NUMBER=.*$/,
          `TWILIO_PHONE_NUMBER=${nonIndianNumbers[0].phone_number}  # Recommended non-Indian number`
        );
        require('fs').writeFileSync('./test-twilio-call.js', updatedFile);
        
        console.log('✅ Updated .env file with recommended number');
        console.log('');
        console.log('Now run: node test-twilio-call.js');
      } else {
        console.log('⚠️ All your numbers are either Indian numbers or lack voice capabilities');
        console.log('');
        console.log('Options:');
        console.log('1. Buy a Twilio phone number from a non-Indian country (US, UK, etc.)');
        console.log('2. Try the Infobip Trusted MSISDN API approach');
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch phone numbers:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message);
      
      if (error.response.data.code === 20003) {
        console.error('');
        console.error('🔍 Authentication Error - check your Account SID and Auth Token');
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

checkTwilioNumbers();