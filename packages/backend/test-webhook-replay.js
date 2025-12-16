const axios = require('axios');

const backend = process.env.BACKEND_URL || 'http://localhost:3000';
const webhook = `${backend}/webhooks/twilio/voice`;
const callsApi = `${backend}/calls`;

async function postWebhook(payload) {
  console.log('POST', payload);
  try {
    const res = await axios.post(webhook, payload, { headers: { 'Content-Type': 'application/json' } });
    console.log('Status:', res.status, 'Data:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Webhook POST failed:', err.response.status, err.response.data);
      throw err;
    }
    console.error('Webhook POST failed:', err.message || err);
    throw err;
  }
}

async function getActiveCalls() {
  const res = await axios.get(callsApi);
  return res.data;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async function run() {
  try {
    const sid = `TS_TEST_${Date.now()}`;
    console.log('Using test CallSid:', sid);

    // 1) Ringing inbound
    await postWebhook({ CallSid: sid, CallStatus: 'ringing', From: '+911234567890', To: process.env.TWILIO_PHONE_NUMBER || '+15005550006', Direction: 'inbound' });
    await sleep(200);
    let calls = await getActiveCalls();
    console.log('Active calls after ringing:', calls.map(c => ({ id: c.id, state: c.state })));

    // 2) Answered
    await postWebhook({ CallSid: sid, CallStatus: 'in-progress' });
    await sleep(200);
    calls = await getActiveCalls();
    console.log('Active calls after in-progress:', calls.map(c => ({ id: c.id, state: c.state })));

    // 3) Completed
    await postWebhook({ CallSid: sid, CallStatus: 'completed' });
    await sleep(200);
    calls = await getActiveCalls();
    console.log('Active calls after completed:', calls.map(c => ({ id: c.id, state: c.state })));

    console.log('Webhook replay test finished.');
  } catch (err) {
    if (err.response) {
      console.error('Test failed - response:', err.response.status, err.response.data);
    } else {
      console.error('Test failed', err.message || err);
    }
    process.exit(1);
  }
})();
