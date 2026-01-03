/**
 * Start Progressive Dialing Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Starts a dialing session for a campaign in progressive mode
 */

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DialingSession, DialingMode, SessionStatus } from '../domain/dialing-session.domain';
import { DialingSessionRepositoryPort, DIALING_SESSION_REPOSITORY_PORT } from '../ports/dialing-session-repository.port';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../../campaign/ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';
import { randomUUID } from 'crypto';

export interface StartProgressiveDialingInput {
  campaignId: string;
  agentIds: string[];
  linesPerAgent?: number;
  maxConcurrentCalls?: number;
  dialTimeoutSeconds?: number;
}

@Injectable()
export class StartProgressiveDialingUseCase {
  constructor(
    @Inject(DIALING_SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: DialingSessionRepositoryPort,
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly campaignRepository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: StartProgressiveDialingInput): Promise<DialingSession> {
    // Validate campaign exists and is active
    const campaign = await this.campaignRepository.findById(input.campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${input.campaignId} not found`);
    }

    if (campaign.status !== 'active') {
      throw new BadRequestException('Campaign must be active to start dialing');
    }

    // Check if there's already an active session
    const existingSession = await this.sessionRepository.findActiveByCampaign(input.campaignId);
    if (existingSession) {
      throw new BadRequestException('Campaign already has an active dialing session');
    }

    // Validate agent list
    if (!input.agentIds || input.agentIds.length === 0) {
      throw new BadRequestException('At least one agent is required');
    }

    // Create new dialing session
    const session = new DialingSession(
      randomUUID(),
      input.campaignId,
      DialingMode.PROGRESSIVE,
      SessionStatus.IDLE,
      campaign.organizationId,
      {
        linesPerAgent: input.linesPerAgent ?? 1,
        targetAbandonmentRate: campaign.abandonmentRate ?? 0.03,
        maxConcurrentCalls: input.maxConcurrentCalls ?? input.agentIds.length * (input.linesPerAgent ?? 1),
        dialTimeoutSeconds: input.dialTimeoutSeconds ?? 30,
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
      input.agentIds,
      new Date(),
      new Date(),
    );

    // Validate domain rules
    session.validate();

    // Start the session
    session.start();

    // Save
    const saved = await this.sessionRepository.save(session);

    // Publish event
    this.eventBus.publish({
      type: 'dialing.session.started',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: {
        sessionId: saved.id,
        campaignId: input.campaignId,
        mode: DialingMode.PROGRESSIVE,
        agentCount: input.agentIds.length,
      },
    });

    return saved;
  }
}
