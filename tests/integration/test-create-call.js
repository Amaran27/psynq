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
      console.log('Login successful');

      // Step 2: Create a call
      const callData = JSON.stringify({ 
        from: 'sysadmin',
        to: '+918608273468'
      });
      const callReq = http.request({
        hostname: '127.0.0.1',
        port: 3001,
        path: '/calls',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': callData.length
        }
      }, (cres) => {
        let cdata = '';
        cres.on('data', (chunk) => { cdata += chunk; });
        cres.on('end', () => {
          console.log('\n=== Call Creation Response ===');
          console.log(`Status: ${cres.statusCode}`);
          console.log(cdata);
        });
      });

      callReq.on('error', (e) => console.error('Call creation error:', e.message));
      callReq.write(callData);
      callReq.end();
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
});

loginReq.on('error', (e) => console.error('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();
