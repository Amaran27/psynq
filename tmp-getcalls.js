const axios = require('axios');
(async function(){
  try {
    const res = await axios.get('http://127.0.0.1:3000/calls');
    console.log('OK', res.status, res.data);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
  }
})();