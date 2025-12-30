const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 8088,
  path: '/ari/channels',
  method: 'POST',
  auth: 'psynq-app:psynq-pass',
  headers: {
    'Content-Type': 'application/json'
  }
};

const data = JSON.stringify({
  endpoint: 'Local/+918608273468@outbound-routing',
  app: 'psynq-app',
  callerId: '+12706481767',
  variables: {
    DESTINATION: '+918608273468'
  }
});

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let d = '';
  res.on('data', (chunk) => {
    d += chunk;
  });
  res.on('end', () => {
    console.log('Response:', d);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(data);
req.end();
