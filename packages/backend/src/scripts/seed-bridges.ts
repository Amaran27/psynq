import AppDataSource from '../data-source';
import { BridgeEntity, BridgeType, BridgeTechnology } from '../entities/bridge.entity';
import { OrganizationEntity } from '../entities/organization.entity';

/**
 * Seed Bridges - Sample data for development/testing
 *
 * Creates representative bridges:
 * - Mixing: Standard conference bridge
 * - Holding: Music on hold bridge
 * - Active with channels
 * - Destroyed bridge
 */

async function seedBridges() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source initialized');

    const bridgeRepo = AppDataSource.getRepository(BridgeEntity);
    const orgRepo = AppDataSource.getRepository(OrganizationEntity);

    // Get first organization
    const organization = await orgRepo.findOne({ where: {} });
    if (!organization) {
      throw new Error('No organizations found. Run seed-users.ts first.');
    }

    console.log(`Seeding bridges for organization: ${organization.name}`);

    // Clear existing bridges
    const existingBridges = await bridgeRepo.find({});
    if (existingBridges.length > 0) {
      await bridgeRepo.remove(existingBridges);
      console.log(`Cleared ${existingBridges.length} existing bridges`);
    }

    // Seed sample bridges
    const seedBridges = [
      // 1. Active mixing bridge with 2 channels
      {
        id: `bridge-conference-${Date.now()}`,
        name: 'Conference Room 1',
        bridgeType: BridgeType.MIXING,
        technology: BridgeTechnology.SOFTMIX,
        organizationId: organization.id,
        channelIds: ['channel-1', 'channel-2'],
        creatorChannelId: 'channel-1',
        isRecording: false,
        createdAt: new Date(Date.now() - 300000), // 5 minutes ago
        destroyedAt: null,
      },
      // 2. Active mixing bridge with 3 channels, recording
      {
        id: `bridge-conf-recording-${Date.now()}`,
        name: 'Sales Team Meeting',
        bridgeType: BridgeType.MIXING,
        technology: BridgeTechnology.SOFTMIX,
        organizationId: organization.id,
        channelIds: ['channel-3', 'channel-4', 'channel-5'],
        creatorChannelId: 'channel-3',
        isRecording: true,
        recordingName: `rec-sales-${new Date().toISOString().split('T')[0]}`,
        createdAt: new Date(Date.now() - 600000), // 10 minutes ago
        destroyedAt: null,
      },
      // 3. Holding bridge (music on hold)
      {
        id: `bridge-hold-${Date.now()}`,
        name: 'Hold Music',
        bridgeType: BridgeType.HOLDING,
        technology: BridgeTechnology.SOFTMIX,
        organizationId: organization.id,
        channelIds: ['channel-6'],
        creatorChannelId: null,
        isRecording: false,
        createdAt: new Date(Date.now() - 120000), // 2 minutes ago
        destroyedAt: null,
      },
      // 4. Empty conference bridge
      {
        id: `bridge-empty-${Date.now()}`,
        name: 'Support Queue Conference',
        bridgeType: BridgeType.MIXING,
        technology: BridgeTechnology.SOFTMIX,
        organizationId: organization.id,
        channelIds: [],
        creatorChannelId: null,
        isRecording: false,
        createdAt: new Date(Date.now() - 60000), // 1 minute ago
        destroyedAt: null,
      },
      // 5. Destroyed bridge
      {
        id: `bridge-destroyed-${Date.now()}`,
        name: 'Customer Service Conference',
        bridgeType: BridgeType.MIXING,
        technology: BridgeTechnology.SOFTMIX,
        organizationId: organization.id,
        channelIds: [],
        creatorChannelId: 'channel-old',
        isRecording: false,
        recordingName: 'rec-cs-2026-01-03',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        destroyedAt: new Date(Date.now() - 1800000), // Destroyed 30 minutes ago
      },
    ];

    await bridgeRepo.save(seedBridges as any);

    console.log('✅ Seeded 5 bridges:');
    console.log('   - 2 Active mixing bridges (one recording)');
    console.log('   - 1 Holding bridge (music on hold)');
    console.log('   - 1 Empty conference bridge');
    console.log('   - 1 Destroyed bridge');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error seeding bridges:', error);
    process.exit(1);
  }
}

seedBridges();
