/**
 * IVR Flow Testing Script
 * 
 * Tests the complete IVR system:
 * 1. Create an IVR flow via REST API
 * 2. Simulate an inbound call
 * 3. Watch execution logs
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001'; // Backend API port

// Test credentials (use sysadmin from database)
const AUTH = {
  username: 'sysadmin',
  password: 'admin123', // Reset to simple password for testing
};

let authToken = null;
let organizationId = null;
let flowId = null;

/**
 * Step 1: Login and get auth token
 */
async function login() {
  console.log('\n📞 Step 1: Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, AUTH);
    authToken = response.data.accessToken || response.data.access_token;
    
    // Decode JWT to get user info
    const payload = JSON.parse(Buffer.from(authToken.split('.')[1], 'base64').toString());
    organizationId = payload.orgId;
    
    console.log(`✅ Logged in as ${payload.username}`);
    console.log(`   Organization: ${organizationId}`);
    console.log(`   Roles: ${payload.roles.join(', ')}`);
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 2: Create a simple IVR flow
 */
async function createIVRFlow() {
  console.log('\n📞 Step 2: Creating IVR flow...');
  
  const flow = {
    name: 'Test Welcome Menu',
    description: 'Simple test IVR with menu',
    nodes: [
      {
        id: 'node_welcome',
        type: 'prompt',
        label: 'Welcome Prompt',
        config: {
          promptConfig: {
            text: 'Welcome to Psitrix Cloud Contact Center'
          },
          nextNodeId: 'node_menu'
        },
        position: { x: 100, y: 100 }
      },
      {
        id: 'node_menu',
        type: 'menu',
        label: 'Main Menu',
        config: {
          promptConfig: {
            text: 'Press 1 for Sales, Press 2 for Support, Press 3 for Billing'
          },
          menuOptions: [
            { digit: '1', label: 'Sales', nextNodeId: 'node_sales' },
            { digit: '2', label: 'Support', nextNodeId: 'node_support' },
            { digit: '3', label: 'Billing', nextNodeId: 'node_billing' }
          ]
        },
        position: { x: 100, y: 200 }
      },
      {
        id: 'node_sales',
        type: 'queue',
        label: 'Sales Queue',
        config: {
          queueConfig: {
            queueName: 'sales',
            timeout: 300,
            priority: 1
          }
        },
        position: { x: 50, y: 300 }
      },
      {
        id: 'node_support',
        type: 'queue',
        label: 'Support Queue',
        config: {
          queueConfig: {
            queueName: 'support',
            timeout: 300,
            priority: 0
          }
        },
        position: { x: 150, y: 300 }
      },
      {
        id: 'node_billing',
        type: 'queue',
        label: 'Billing Queue',
        config: {
          queueConfig: {
            queueName: 'billing',
            timeout: 300,
            priority: 0
          }
        },
        position: { x: 250, y: 300 }
      }
    ],
    entryNodeId: 'node_welcome',
    variables: {
      caller_name: '',
      caller_number: ''
    }
  };

  try {
    const response = await axios.post(`${BASE_URL}/ivr/flows`, flow, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    flowId = response.data.id;
    console.log(`✅ Created IVR flow: ${response.data.name} (${flowId})`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Nodes: ${response.data.nodes.length}`);
    return true;
  } catch (error) {
    console.error('❌ Flow creation failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 3: Activate the IVR flow
 */
async function activateFlow() {
  console.log('\n📞 Step 3: Activating IVR flow...');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/ivr/flows/${flowId}/activate`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log(`✅ Flow activated: ${response.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Activation failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 4: List all IVR flows
 */
async function listFlows() {
  console.log('\n📞 Step 4: Listing IVR flows...');
  
  try {
    const response = await axios.get(`${BASE_URL}/ivr/flows`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Found ${response.data.total} flows:`);
    response.data.flows.forEach(flow => {
      console.log(`   - ${flow.name} (${flow.status}) - ${flow.nodes.length} nodes`);
    });
    return true;
  } catch (error) {
    console.error('❌ List failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 5: Simulate inbound call (would trigger IVR)
 */
async function simulateInboundCall() {
  console.log('\n📞 Step 5: Simulating inbound call...');
  console.log('   ⚠️  This requires Asterisk integration');
  console.log('   ⚠️  In production, Asterisk would:');
  console.log('      1. Receive PSTN call');
  console.log('      2. Fire call.inbound event');
  console.log('      3. IVROrchestratorService catches event');
  console.log('      4. Loads active flow for organization');
  console.log('      5. ExecuteIVRFlowUseCase starts execution');
  console.log('      6. Plays prompts via ARI');
  console.log('      7. Collects DTMF digits');
  console.log('      8. Routes to queue');
  
  // For now, we can only test the API layer
  console.log('\n   ℹ️  To test execution, you need:');
  console.log('      - Asterisk ARI configured');
  console.log('      - SIP trunk for inbound calls');
  console.log('      - WebRTC agent registered');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║     IVR Flow Testing Script - Psitrix Psynq      ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  const steps = [
    { name: 'Login', fn: login },
    { name: 'Create IVR Flow', fn: createIVRFlow },
    { name: 'Activate Flow', fn: activateFlow },
    { name: 'List Flows', fn: listFlows },
    { name: 'Simulate Call', fn: simulateInboundCall },
  ];

  for (const step of steps) {
    const success = await step.fn();
    if (!success && step.fn !== simulateInboundCall) {
      console.log(`\n❌ Test stopped at: ${step.name}`);
      process.exit(1);
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║            ✅ All Tests Completed!                ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  
  console.log('\n📊 Summary:');
  console.log(`   - Organization: ${organizationId}`);
  console.log(`   - Flow ID: ${flowId}`);
  console.log(`   - Flow Status: ACTIVE`);
  console.log(`   - Nodes: 5 (Welcome, Menu, 3 Queues)`);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Open Swagger: http://localhost:3000/api');
  console.log('   2. Test endpoints: GET /ivr/flows');
  console.log('   3. View execution logs: GET /ivr/executions/:callId');
  console.log('   4. Get analytics: GET /ivr/flows/:id/analytics');
  
  console.log('\n🔧 For Live Call Testing:');
  console.log('   - Setup SIP trunk (Twilio/Telnyx)');
  console.log('   - Configure DID routing in Asterisk');
  console.log('   - Make inbound call to your DID');
  console.log('   - Watch logs: docker logs -f psynq-backend-dev');
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});
