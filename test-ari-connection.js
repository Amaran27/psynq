#!/usr/bin/env node

/**
 * Test script to verify Asterisk ARI connection
 * Run with: node test-ari-connection.js
 */

const http = require('http');

const ARI_URL = 'http://127.0.0.1:8088';
const ARI_USER = 'psynq-app';
const ARI_PASS = 'psynq-pass';

function testARIConnection() {
  console.log('Testing Asterisk ARI connection...');
  console.log(`URL: ${ARI_URL}`);
  console.log(`User: ${ARI_USER}`);
  console.log('');

  const options = {
    hostname: '127.0.0.1',
    port: 8088,
    path: '/ari/endpoints',
    auth: `${ARI_USER}:${ARI_PASS}`,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log('');

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ ARI Connection successful!');
        try {
          const endpoints = JSON.parse(data);
          console.log(`Found ${Object.keys(endpoints).length} endpoints`);
          console.log('');
          console.log('Endpoints:');
          for (const [id, endpoint] of Object.entries(endpoints)) {
            console.log(`  - ${id}: ${endpoint.resource_type}`);
          }
        } catch (e) {
          console.log('Response:', data.substring(0, 200));
        }
      } else {
        console.log('❌ ARI Connection failed!');
        console.log('Response:', data.substring(0, 500));
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Connection error:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure Asterisk is running: docker exec psynq-asterisk asterisk -rx "core show version"');
    console.log('2. Check HTTP is enabled: docker exec psynq-asterisk asterisk -rx "http show status"');
    console.log('3. Verify ARI user: docker exec psynq-asterisk asterisk -rx "ari show users"');
    console.log('4. Check firewall: curl -v http://127.0.0.1:8088/ari/endpoints');
  });

  req.end();
}

testARIConnection();
