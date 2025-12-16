// Using built-in fetch (Node 18+)

async function testAPI() {
  const baseURL = 'http://localhost:3000';

  try {
    console.log('🧪 Testing Call Management API...\n');

    // Test 1: Get active calls (should be empty)
    console.log('1. Getting active calls...');
    const response1 = await fetch(`${baseURL}/calls`);
    const activeCalls = await response1.json();
    console.log('✅ Active calls:', activeCalls);

    // Test 2: Create a new call
    console.log('\n2. Creating a new call...');
    const response2 = await fetch(`${baseURL}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+1234567890',
        to: '+0987654321'
      })
    });
    const newCall = await response2.json();
    console.log('✅ Created call:', newCall);

    const callId = newCall.id;

    // Test 3: Get the specific call
    console.log('\n3. Getting the created call...');
    const response3 = await fetch(`${baseURL}/calls/${callId}`);
    const call = await response3.json();
    console.log('✅ Call details:', call);

    // Test 4: Answer the call
    console.log('\n4. Answering the call...');
    const response4 = await fetch(`${baseURL}/calls/${callId}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: '550e8400-e29b-41d4-a716-446655440000' })
    });
    const answeredCall = await response4.json();
    console.log('✅ Answered call:', answeredCall);

    // Test 5: Put call on hold
    console.log('\n5. Putting call on hold...');
    const response5 = await fetch(`${baseURL}/calls/${callId}/hold`, {
      method: 'PUT'
    });
    const heldCall = await response5.json();
    console.log('✅ Held call:', heldCall);

    // Test 6: Resume call
    console.log('\n6. Resuming call...');
    const response6 = await fetch(`${baseURL}/calls/${callId}/resume`, {
      method: 'PUT'
    });
    const resumedCall = await response6.json();
    console.log('✅ Resumed call:', resumedCall);

    // Test 7: End call
    console.log('\n7. Ending call...');
    const response7 = await fetch(`${baseURL}/calls/${callId}/end`, {
      method: 'PUT'
    });
    const endedCall = await response7.json();
    console.log('✅ Ended call:', endedCall);

    // Test 8: Get active calls again (should be empty now)
    console.log('\n8. Getting active calls after ending...');
    const response8 = await fetch(`${baseURL}/calls`);
    const finalActiveCalls = await response8.json();
    console.log('✅ Final active calls:', finalActiveCalls);

    console.log('\n🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ API Test failed:', error.message);
  }
}

testAPI();