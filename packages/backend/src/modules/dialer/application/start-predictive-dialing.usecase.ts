/**
 * Start Predictive Dialing Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Starts a predictive dialing session with algorithmic pacing
 */

import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DialingSession, DialingMode, SessionStatus } from '../domain/dialing-session.domain';
import { 
  DialingSessionRepositoryPort, 
  DIALING_SESSION_REPOSITORY_PORT 
} from '../ports/dialing-session-repository.port';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../../campaign/ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';
import { randomUUID } from 'crypto';

export interface StartPredictiveDialingInput {
  campaignId: string;
  agentIds: string[];
  targetAbandonmentRate?: number; // Default 3% (0.03)
  maxConcurrentCalls?: number; // Default 100
  linesPerAgent?: number; // Starting ratio, default 2.0
}

/**
 * Start Predictive Dialing Workflow:
 * 1. Validate campaign exists and not already active
 * 2. Create predictive dialing session with pacing config
 * 3. Initialize statistics tracking
 * 4. Start session in ACTIVE state
 * 5. Event triggers predictive pacer to begin dialing
 */
@Injectable()
export class StartPredictiveDialingUseCase {
  constructor(
    @Inject(DIALING_SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: DialingSessionRepositoryPort,
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly campaignRepository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: StartPredictiveDialingInput): Promise<DialingSession> {
    // Validate campaign exists
    const campaign = await this.campaignRepository.findById(input.campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${input.campaignId} not found`);
    }

    // Ensure campaign is not already active
    const existingSession = await this.sessionRepository.findActiveByCampaign(input.campaignId);
    if (existingSession) {
      throw new BadRequestException('Campaign already has an active dialing session');
    }

    // Validate at least one agent
    if (!input.agentIds || input.agentIds.length === 0) {
      throw new BadRequestException('At least one agent must be assigned to the session');
    }

    // Validate target abandonment rate (typically 1-10%)
    const targetAbandonmentRate = input.targetAbandonmentRate ?? 0.03;
    if (targetAbandonmentRate < 0.01 || targetAbandonmentRate > 0.15) {
      throw new BadRequestException('Target abandonment rate must be between 1% and 15%');
    }

    // Create predictive dialing session
    const session = new DialingSession(
      randomUUID(),
      input.campaignId,
      DialingMode.PREDICTIVE,
      SessionStatus.IDLE,
      campaign.organizationId,
      {
        linesPerAgent: input.linesPerAgent ?? 2.0, // Start with 2:1 ratio
        targetAbandonmentRate: targetAbandonmentRate,
        maxConcurrentCalls: input.maxConcurrentCalls ?? Math.max(50, input.agentIds.length * 3),
        dialTimeoutSeconds: 30,
      },
      {
        leadsProcessed: 0,
        callsAttempted: 0,
        callsAnswered: 0,
        callsAbandoned: 0,
        avgWaitTimeSeconds: 0,
        avgTalkTimeSeconds: 0,
        conversionRate: 0,
      },
      [], // activeAgentIds - will be added below
      new Date(),
      new Date(),
    );

    // Add agents to session
    input.agentIds.forEach(agentId => session.addAgent(agentId));

    // Start the session
    session.start();

    // Persist
    await this.sessionRepository.save(session);

    // Publish event
    this.eventBus.publish({
      type: 'dialing_session.started',
      organizationId: session.organizationId || 'unknown',
      payload: {
        sessionId: session.id,
        campaignId: session.campaignId,
        mode: session.mode,
        agentCount: session.activeAgentIds.length,
        targetAbandonmentRate: session.pacingConfig.targetAbandonmentRate,
        linesPerAgent: session.pacingConfig.linesPerAgent,
      },
      timestamp: new Date(),
    });

    return session;
  }
}
