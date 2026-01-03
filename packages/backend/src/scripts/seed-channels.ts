import AppDataSource from '../data-source';
import { ChannelEntity, ChannelState, ChannelDirection } from '../entities/channel.entity';
import { OrganizationEntity } from '../entities/organization.entity';
import { CallEntity } from '../entities/call.entity';

/**
 * Seed Channels - Sample data for development/testing
 *
 * Creates representative channels in various states:
 * - Down: Initial state (outbound not yet dialed, inbound after hangup)
 * - Ringing: Incoming call alerting, outbound call ringing remote party
 * - Up: Answered call, media flowing
 * - Busy: Remote party busy
 * 
 * Links channels to existing organizations and calls.
 */

async function seedChannels() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source initialized');

    const channelRepo = AppDataSource.getRepository(ChannelEntity);
    const orgRepo = AppDataSource.getRepository(OrganizationEntity);
    const callRepo = AppDataSource.getRepository(CallEntity);

    // Get first organization
    const organization = await orgRepo.findOne({ where: {} });
    if (!organization) {
      throw new Error('No organizations found. Run seed-users.ts first.');
    }

    // Get a sample call to link channels
    const sampleCall = await callRepo.findOne({ where: { organizationId: organization.id } });

    console.log(`Seeding channels for organization: ${organization.name}`);

    // Clear existing channels
    const existingChannels = await channelRepo.find({});
    if (existingChannels.length > 0) {
      await channelRepo.remove(existingChannels);
      console.log(`Cleared ${existingChannels.length} existing channels`);
    }

    // Seed sample channels in various states
    const seedChannels = [
      // 1. Down state - Outbound channel not yet originated
      {
        id: `channel-down-${Date.now()}`,
        destination: 'sip:+15551234567@trunk.example.com',
        state: ChannelState.DOWN,
        direction: ChannelDirection.OUTBOUND,
        organizationId: organization.id,
        callId: sampleCall?.id || null,
        callerNumber: '+15559876543',
        callerName: 'Agent Desktop',
        connectedNumber: null,
        connectedName: null,
        bridgeId: null,
        createdAt: new Date(),
        answeredAt: null,
        endedAt: new Date(), // Ended immediately
      },
      // 2. Ringing state - Inbound call alerting
      {
        id: `channel-ringing-in-${Date.now()}`,
        destination: 'sip:support@voip.acme.com',
        state: ChannelState.RINGING,
        direction: ChannelDirection.INBOUND,
        organizationId: organization.id,
        callId: sampleCall?.id || null,
        callerNumber: '+15551112222',
        callerName: 'John Customer',
        connectedNumber: null,
        connectedName: null,
        bridgeId: null,
        createdAt: new Date(Date.now() - 5000), // 5 seconds ago
        answeredAt: null,
        endedAt: null,
      },
      // 3. Ringing state - Outbound call, remote party ringing
      {
        id: `channel-ringing-out-${Date.now()}`,
        destination: 'sip:+15553334444@trunk.example.com',
        state: ChannelState.RINGING,
        direction: ChannelDirection.OUTBOUND,
        organizationId: organization.id,
        callId: sampleCall?.id || null,
        callerNumber: '+15559876543',
        callerName: 'Sales Agent',
        connectedNumber: null,
        connectedName: null,
        bridgeId: null,
        createdAt: new Date(Date.now() - 8000), // 8 seconds ago
        answeredAt: null,
        endedAt: null,
      },
      // 4. Up state - Active answered call
      {
        id: `channel-up-${Date.now()}`,
        destination: 'sip:+15555556666@trunk.example.com',
        state: ChannelState.UP,
        direction: ChannelDirection.OUTBOUND,
        organizationId: organization.id,
        callId: sampleCall?.id || null,
        callerNumber: '+15559876543',
        callerName: 'Support Agent',
        connectedNumber: '+15555556666',
        connectedName: 'Jane Client',
        bridgeId: `bridge-${Date.now()}`,
        createdAt: new Date(Date.now() - 120000), // 2 minutes ago
        answeredAt: new Date(Date.now() - 115000), // Answered 1:55 ago
        endedAt: null,
      },
      // 5. Busy state - Remote party busy
      {
        id: `channel-busy-${Date.now()}`,
        destination: 'sip:+15557778888@trunk.example.com',
        state: ChannelState.BUSY,
        direction: ChannelDirection.OUTBOUND,
        organizationId: organization.id,
        callId: null, // No call linked
        callerNumber: '+15559876543',
        callerName: 'Outbound Campaign',
        connectedNumber: null,
        connectedName: null,
        bridgeId: null,
        createdAt: new Date(Date.now() - 10000),
        answeredAt: null,
        endedAt: new Date(Date.now() - 2000), // Ended 2 seconds ago
      },
      // 6. Down state - Ended call (inbound, was answered)
      {
        id: `channel-ended-${Date.now()}`,
        destination: 'sip:support@voip.acme.com',
        state: ChannelState.DOWN,
        direction: ChannelDirection.INBOUND,
        organizationId: organization.id,
        callId: sampleCall?.id || null,
        callerNumber: '+15559991111',
        callerName: 'Bob Customer',
        connectedNumber: '+15559876543',
        connectedName: 'Agent Alice',
        bridgeId: null, // Bridge destroyed
        createdAt: new Date(Date.now() - 600000), // 10 minutes ago
        answeredAt: new Date(Date.now() - 595000), // Answered after 5 seconds
        endedAt: new Date(Date.now() - 60000), // Ended 1 minute ago
      },
    ];

    await channelRepo.save(seedChannels as any);

    console.log('✅ Seeded 6 channels:');
    console.log('   - 2 Down (not originated, ended)');
    console.log('   - 2 Ringing (inbound alerting, outbound ringing)');
    console.log('   - 1 Up (active call)');
    console.log('   - 1 Busy (remote busy)');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error seeding channels:', error);
    process.exit(1);
  }
}

seedChannels();
