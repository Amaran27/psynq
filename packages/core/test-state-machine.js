import { Call, CallState, CallStateMachine } from './dist/index.js';

// Test the state machine
console.log('🧪 Testing Call State Machine...\n');

const stateMachine = new CallStateMachine();
const call = new Call('test-call-123', '+1234567890', '+0987654321');

console.log(`Initial state: ${call.state}`);

// Test valid transitions
try {
  console.log('Starting call...');
  stateMachine.startCall(call);
  console.log(`✅ State: ${call.state}`);

  console.log('Answering call...');
  stateMachine.answerCall(call);
  console.log(`✅ State: ${call.state}, Answered at: ${call.answeredAt}`);

  console.log('Putting on hold...');
  stateMachine.holdCall(call);
  console.log(`✅ State: ${call.state}`);

  console.log('Resuming call...');
  stateMachine.resumeCall(call);
  console.log(`✅ State: ${call.state}`);

  console.log('Ending call...');
  stateMachine.endCall(call);
  console.log(`✅ State: ${call.state}, Ended at: ${call.endedAt}`);

} catch (error) {
  console.error('❌ Error:', error.message);
}

// Test invalid transitions
console.log('\n🧪 Testing invalid transitions...');
const call2 = new Call('test-call-456', '+1111111111', '+2222222222');

try {
  console.log('Trying to answer a call that hasn\'t started ringing...');
  stateMachine.answerCall(call2);
  console.log('❌ Should have thrown error!');
} catch (error) {
  console.log(`✅ Correctly prevented invalid transition: ${error.message}`);
}

console.log('\n🎉 State machine tests completed!');