// Real-time test for WebSocket updates in UI
// This test verifies that WebSocket events are properly sent when calls change

const io = require('socket.io-client');

async function testWebSocketRealTime() {
  console.log('🔌 Testing WebSocket Real-time Updates...\n');

  const backendUrl = 'http://localhost:3000';
  const frontendUrl = 'http://localhost:3001';

  let socket;
  let newCallReceived = false;
  let callUpdateReceived = false;
  let receivedCall;

  try {
    // Connect to WebSocket
    console.log('1. Connecting to WebSocket...');
    socket = io(backendUrl);
    await new Promise((resolve) => {
      socket.on('connect', resolve);
      socket.on('connect_error', () => resolve()); // Resolve anyway for demo
    });
    console.log('✅ Connected to WebSocket');

    // Listen for new calls
    socket.on('newCall', (call) => {
      console.log('📞 Received newCall event:', call.id, '- State:', call.state);
      newCallReceived = true;
      receivedCall = call;
    });

    // Listen for call updates
    socket.on('callUpdate', (call) => {
      console.log('🔄 Received callUpdate event:', call.id, '- State:', call.state);
      callUpdateReceived = true;
    });

    // Create a test call via REST API
    console.log('\n2. Creating a test call via backend API...');
    const createResponse = await fetch(`${backendUrl}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+15559998877',
        to: '+15551112233'
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create call: ${createResponse.status}`);
    }

    const newCall = await createResponse.json();
    console.log('✅ Created call via REST:', newCall.id);

    // Wait for WebSocket events (with timeout)
    console.log('\n3. Waiting for WebSocket events...');
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000); // 3 second timeout
      const check = setInterval(() => {
        if (newCallReceived) {
          clearTimeout(timeout);
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

    // Answer the call
    console.log('\n4. Answering the call...');
    const answerResponse = await fetch(`${backendUrl}/calls/${newCall.id}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: '550e8400-e29b-41d4-a716-446655440000' })
    });

    if (!answerResponse.ok) {
      const error = await answerResponse.json();
      throw new Error(`Failed to answer call: ${error.message}`);
    }

    const answeredCall = await answerResponse.json();
    console.log('✅ Call answered via REST, state:', answeredCall.state);

    // Wait for update events
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000); // 3 second timeout
      const check = setInterval(() => {
        if (callUpdateReceived) {
          clearTimeout(timeout);
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

    // End the call
    console.log('\n5. Ending the call...');
    const endResponse = await fetch(`${backendUrl}/calls/${newCall.id}/end`, {
      method: 'PUT'
    });

    if (!endResponse.ok) {
      const error = await endResponse.json();
      throw new Error(`Failed to end call: ${error.message}`);
    }

    const endedCall = await endResponse.json();
    console.log('✅ Call ended via REST, state:', endedCall.state);

    // Final wait for any additional events
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify results
    console.log('\n📋 WebSocket Test Results:');
    console.log('New call event received:', newCallReceived ? '✅' : '❌');
    console.log('Call update event received:', callUpdateReceived ? '✅' : '❌');

    if (newCallReceived && callUpdateReceived) {
      console.log('\n🎉 WebSocket Real-time Updates Test Passed!');
      console.log('\n📈 What this means:');
      console.log('- UI will automatically receive new call notifications ✅');
      console.log('- UI will automatically refresh when calls change state ✅');
      console.log('- No manual polling required for real-time updates ✅');
    } else {
      console.log('\n⚠️ WebSocket Test Failed');
      if (!newCallReceived) console.log('- Did not receive newCall event ❌');
      if (!callUpdateReceived) console.log('- Did not receive callUpdate event ❌');
    }

  } catch (error) {
    console.error('❌ WebSocket test failed:', error.message);
  } finally {
    if (socket) {
      socket.disconnect();
    }
  }
}

testWebSocketRealTime();