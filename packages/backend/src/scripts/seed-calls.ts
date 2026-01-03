import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { CallEntity } from '../entities/call.entity';
import { CallParticipantEntity } from '../entities/call-participant.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { OrganizationEntity } from '../entities/organization.entity';
import { CallDirection, CallState } from '@psynq/core';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const callRepo = dataSource.getRepository(CallEntity);
  const participantRepo = dataSource.getRepository(CallParticipantEntity);
  const userRepo = dataSource.getRepository(UserEntity);
  const orgRepo = dataSource.getRepository(OrganizationEntity);

  console.log('--- Psynq Call Seeding Protocol ---');

  try {
    // Find system organization and an agent
    const org = await orgRepo.findOne({ where: { slug: 'system' } });
    if (!org) {
      throw new Error('System organization not found. Run seed-system.ts first.');
    }

    const agent = await userRepo.findOne({
      where: { organizationId: org.id, roles: UserRole.AGENT },
    });

    const agentId = agent?.id || 'demo-agent-1';

    // Check if seed data already exists
    const existingCalls = await callRepo.count();
    if (existingCalls > 0) {
      console.log(`[SKIP] ${existingCalls} calls already exist. Skipping seed.`);
      return;
    }

    // Seed sample calls in various states
    const seedCalls = [
      {
        id: 'call-ringing-001',
        state: CallState.RINGING,
        direction: CallDirection.INBOUND,
        from: '+15551234567',
        to: '+18005551212',
        agentId,
        organizationId: org.id,
        startedAt: new Date(Date.now() - 10000), // 10 seconds ago
      },
      {
        id: 'call-answered-001',
        state: CallState.ANSWERED,
        direction: CallDirection.OUTBOUND,
        from: '+18005551212',
        to: '+15559876543',
        agentId,
        organizationId: org.id,
        startedAt: new Date(Date.now() - 120000), // 2 minutes ago
        answeredAt: new Date(Date.now() - 110000), // answered 10s after start
      },
      {
        id: 'call-onhold-001',
        state: CallState.ON_HOLD,
        direction: CallDirection.INBOUND,
        from: '+15558675309',
        to: '+18005551212',
        agentId,
        organizationId: org.id,
        startedAt: new Date(Date.now() - 300000), // 5 minutes ago
        answeredAt: new Date(Date.now() - 290000),
      },
      {
        id: 'call-ended-001',
        state: CallState.ENDED,
        direction: CallDirection.OUTBOUND,
        from: '+18005551212',
        to: '+15551112222',
        agentId,
        organizationId: org.id,
        startedAt: new Date(Date.now() - 600000), // 10 minutes ago
        answeredAt: new Date(Date.now() - 590000),
        endedAt: new Date(Date.now() - 300000), // ended 5 minutes ago
      },
      {
        id: 'call-ended-002',
        state: CallState.ENDED,
        direction: CallDirection.INBOUND,
        from: '+15554443333',
        to: '+18005551212',
        organizationId: org.id,
        startedAt: new Date(Date.now() - 1800000), // 30 minutes ago
        endedAt: new Date(Date.now() - 1740000), // ended after 1 minute (unanswered)
      },
    ];

    for (const callData of seedCalls) {
      const call = callRepo.create(callData);
      await callRepo.save(call);
      console.log(`[CREATED] Call ${call.id} (${call.state}, ${call.direction})`);

      // Create sample participants for answered/on-hold calls
      if (
        call.state === CallState.ANSWERED ||
        call.state === CallState.ON_HOLD
      ) {
        const participants = [
          {
            callId: call.id,
            participantId: call.from,
            participantType: 'customer' as const,
            providerCallSid: `CA${call.id}_customer`,
            isMuted: false,
            isOnHold: call.state === CallState.ON_HOLD,
            joinedAt: call.startedAt,
          },
          {
            callId: call.id,
            participantId: agentId,
            participantType: 'agent' as const,
            providerCallSid: `CA${call.id}_agent`,
            isMuted: false,
            isOnHold: false,
            joinedAt: call.answeredAt || call.startedAt,
          },
        ];

        for (const pData of participants) {
          const participant = participantRepo.create(pData);
          await participantRepo.save(participant);
          console.log(
            `  [PARTICIPANT] ${pData.participantType}: ${pData.participantId}`,
          );
        }
      }
    }

    console.log('[SUCCESS] Call seeding complete.');
  } catch (error) {
    console.error('[ERROR] Call seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
