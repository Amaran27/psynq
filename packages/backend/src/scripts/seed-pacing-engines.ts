/**
 * Seed Pacing Engines
 * 
 * Creates default pacing engine configurations for testing and development
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { PacingEngineEntity, PacingAlgorithm, PacingStatus } from '../entities/dialer/pacing-engine.entity';

dotenv.config();

async function seedPacingEngines() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'psynq',
    entities: [PacingEngineEntity],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected');

    const pacingEngineRepo = dataSource.getRepository(PacingEngineEntity);

    // Check if pacing engines already exist
    const existing = await pacingEngineRepo.count();
    if (existing > 0) {
      console.log(`${existing} pacing engines already exist, skipping seed`);
      await dataSource.destroy();
      return;
    }

    // Get system organization ID
    const systemOrgResult = await dataSource.query(
      `SELECT id FROM organizations WHERE name = 'System Organization' LIMIT 1`,
    );
    const systemOrgId = systemOrgResult[0]?.id;

    if (!systemOrgId) {
      console.warn('System Organization not found, creating pacing engines without organization');
    }

    // Create default pacing engine configurations
    const defaultConfigs = [
      {
        organizationId: systemOrgId,
        algorithm: PacingAlgorithm.ERLANG_C,
        status: PacingStatus.IDLE,
        targetAbandonmentRate: 3.0,
        maxConcurrentCalls: 10,
        linesPerAgent: 1,
        dialTimeoutSeconds: 30,
        minAgentsRequired: 5,
        availableAgents: 0,
        busyAgents: 0,
        activeCalls: 0,
        queuedCalls: 0,
        avgAnswerTimeSeconds: 0,
        avgCallDurationSeconds: 0,
        contactRate: 0.5,
        actualAbandonmentRate: 0,
        pacingCalculation: {},
        totalCallsDialed: 0,
        totalCallsAnswered: 0,
        totalCallsAbandoned: 0,
        totalCallsConnected: 0,
        customParameters: {
          name: 'Conservative Pacing',
          description: 'Low abandonment rate, suitable for compliance-focused campaigns',
        },
      },
      {
        organizationId: systemOrgId,
        algorithm: PacingAlgorithm.ERLANG_C,
        status: PacingStatus.IDLE,
        targetAbandonmentRate: 5.0,
        maxConcurrentCalls: 20,
        linesPerAgent: 2,
        dialTimeoutSeconds: 25,
        minAgentsRequired: 3,
        availableAgents: 0,
        busyAgents: 0,
        activeCalls: 0,
        queuedCalls: 0,
        avgAnswerTimeSeconds: 0,
        avgCallDurationSeconds: 0,
        contactRate: 0.5,
        actualAbandonmentRate: 0,
        pacingCalculation: {},
        totalCallsDialed: 0,
        totalCallsAnswered: 0,
        totalCallsAbandoned: 0,
        totalCallsConnected: 0,
        customParameters: {
          name: 'Balanced Pacing',
          description: 'Moderate abandonment rate, good balance between efficiency and compliance',
        },
      },
      {
        organizationId: systemOrgId,
        algorithm: PacingAlgorithm.ERLANG_C,
        status: PacingStatus.IDLE,
        targetAbandonmentRate: 7.0,
        maxConcurrentCalls: 50,
        linesPerAgent: 3,
        dialTimeoutSeconds: 20,
        minAgentsRequired: 2,
        availableAgents: 0,
        busyAgents: 0,
        activeCalls: 0,
        queuedCalls: 0,
        avgAnswerTimeSeconds: 0,
        avgCallDurationSeconds: 0,
        contactRate: 0.5,
        actualAbandonmentRate: 0,
        pacingCalculation: {},
        totalCallsDialed: 0,
        totalCallsAnswered: 0,
        totalCallsAbandoned: 0,
        totalCallsConnected: 0,
        customParameters: {
          name: 'Aggressive Pacing',
          description: 'Higher abandonment rate, maximizes agent talk time',
        },
      },
      {
        organizationId: systemOrgId,
        algorithm: PacingAlgorithm.FIXED_RATIO,
        status: PacingStatus.IDLE,
        targetAbandonmentRate: 0,
        maxConcurrentCalls: 10,
        linesPerAgent: 1,
        dialTimeoutSeconds: 30,
        minAgentsRequired: 1,
        availableAgents: 0,
        busyAgents: 0,
        activeCalls: 0,
        queuedCalls: 0,
        avgAnswerTimeSeconds: 0,
        avgCallDurationSeconds: 0,
        contactRate: 0.5,
        actualAbandonmentRate: 0,
        pacingCalculation: {},
        totalCallsDialed: 0,
        totalCallsAnswered: 0,
        totalCallsAbandoned: 0,
        totalCallsConnected: 0,
        customParameters: {
          name: 'Fixed Ratio Power Dialing',
          description: 'Simple 1:1 ratio for power dialing mode',
        },
      },
    ];

    for (const config of defaultConfigs) {
      const pacingEngine = pacingEngineRepo.create(config);
      await pacingEngineRepo.save(pacingEngine);
      console.log(`Created pacing engine: ${config.customParameters?.name}`);
    }

    console.log('Pacing engine seed completed successfully');
    await dataSource.destroy();
  } catch (error) {
    console.error('Error seeding pacing engines:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedPacingEngines();
}

export { seedPacingEngines };
