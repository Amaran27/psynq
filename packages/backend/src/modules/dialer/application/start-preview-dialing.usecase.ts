/**
 * Start Preview Dialing Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Starts a preview dialing session where agents manually review and dial leads
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

export interface StartPreviewDialingInput {
  campaignId: string;
  agentIds: string[];
  maxConcurrentSessions?: number;
}

/**
 * Preview Dialing Session Workflow:
 * 1. Agent logs in and joins preview session
 * 2. System presents next available lead for review
 * 3. Agent reviews lead details (name, phone, history, notes)
 * 4. Agent decides: DIAL or SKIP
 * 5. If DIAL: System initiates call and connects agent
 * 6. If SKIP: System presents next lead
 * 7. After call: Agent completes disposition
 * 8. Cycle repeats until no more leads or agent signs off
 */
@Injectable()
export class StartPreviewDialingUseCase {
  constructor(
    @Inject(DIALING_SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: DialingSessionRepositoryPort,
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly campaignRepository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: StartPreviewDialingInput): Promise<DialingSession> {
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

    // Create preview dialing session
    const session = new DialingSession(
      randomUUID(),
      input.campaignId,
      DialingMode.PREVIEW,
      SessionStatus.IDLE,
      campaign.organizationId,
      {
        linesPerAgent: 1, // Preview is always 1:1 (one lead per agent at a time)
        targetAbandonmentRate: 0, // No abandonment in preview (agent controls dialing)
        maxConcurrentCalls: input.maxConcurrentSessions || input.agentIds.length,
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
      },
      timestamp: new Date(),
    });

    return session;
  }
}
