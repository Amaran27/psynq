const axios = require('axios');
(async function() {
  try {
    const res = await axios.post('http://127.0.0.1:3000/webhooks/twilio/voice', { CallSid: 'TS_MANUAL', CallStatus: 'ringing', From: '+911234567890', To: '+15005550006', Direction: 'inbound' }, { headers: { 'Content-Type': 'application/json' } });
    console.log('OK', res.status, res.data);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    if (err.response) {
      console.error('RESP', err.response.status, err.response.data);
    }
  }
})();