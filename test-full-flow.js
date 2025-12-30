const http = require('http');

// Step 1: Login
const loginData = 'username=sysadmin&password=PsynqSecure2025!!';

const loginReq = http.request({
  hostname: '127.0.0.1',
  port: 3001,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': loginData.length
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const loginResult = JSON.parse(data);
      const token = loginResult.access_token;
      console.log('Login successful, token:', token.substring(0, 50) + '...');

      // Step 2: Get WebRTC token
      const telephonyData = JSON.stringify({ agentId: 'sysadmin' });
      const telephonyReq = http.request({
        hostname: '127.0.0.1',
        port: 3001,
        path: '/telephony/token',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': telephonyData.length
        }
      }, (tres) => {
        let tdata = '';
        tres.on('data', (chunk) => { tdata += chunk; });
        tres.on('end', () => {
          console.log('\n=== WebRTC Token Response ===');
          console.log(tdata);
        });
      });

      telephonyReq.on('error', (e) => console.error('Telephony token error:', e.message));
      telephonyReq.write(telephonyData);
      telephonyReq.end();
    } catch (e) {
      console.error('Login error:', e.message);
    }
  });
});

loginReq.on('error', (e) => console.error('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();
