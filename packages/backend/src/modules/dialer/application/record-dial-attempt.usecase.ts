/**
 * Record Dial Attempt Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Records a dial attempt for a lead with outcome
 */

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Lead, LeadCallOutcome } from '../domain/lead.domain';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';
import { DialingSessionRepositoryPort, DIALING_SESSION_REPOSITORY_PORT } from '../ports/dialing-session-repository.port';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../../campaign/ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';

export interface RecordDialAttemptInput {
  leadId: string;
  outcome: LeadCallOutcome;
  callDurationSeconds?: number;
  notes?: string;
}

@Injectable()
export class RecordDialAttemptUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT)
    private readonly leadRepository: LeadRepositoryPort,
    @Inject(DIALING_SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: DialingSessionRepositoryPort,
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly campaignRepository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: RecordDialAttemptInput): Promise<Lead> {
    // Find lead
    const lead = await this.leadRepository.findById(input.leadId);
    if (!lead) {
      throw new NotFoundException(`Lead ${input.leadId} not found`);
    }

    // Get campaign for configuration
    const campaign = await this.campaignRepository.findById(lead.campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${lead.campaignId} not found`);
    }

    // Record attempt
    lead.recordAttempt(input.outcome, input.callDurationSeconds, input.notes);

    // Schedule next attempt if not final outcome
    if (input.outcome !== LeadCallOutcome.ANSWERED &&
        input.outcome !== LeadCallOutcome.WRONG_NUMBER &&
        input.outcome !== LeadCallOutcome.DISCONNECTED) {
      lead.scheduleNextAttempt(campaign.retryIntervalMinutes);
    }

    // Save
    const saved = await this.leadRepository.save(lead);

    // Update session stats
    const session = await this.sessionRepository.findActiveByCampaign(lead.campaignId);
    if (session) {
      session.recordCallAttempt();
      
      if (input.outcome === LeadCallOutcome.ANSWERED && input.callDurationSeconds) {
        session.recordCallAnswered(input.callDurationSeconds);
      }

      await this.sessionRepository.save(session);
    }

    // Update campaign stats
    campaign.incrementContactedLeads();
    if (input.outcome === LeadCallOutcome.ANSWERED) {
      campaign.incrementSuccessfulCalls();
    } else {
      campaign.incrementFailedAttempts();
    }
    await this.campaignRepository.save(campaign);

    // Publish event
    this.eventBus.publish({
      type: 'lead.dial_attempt_recorded',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: {
        leadId: saved.id,
        campaignId: lead.campaignId,
        outcome: input.outcome,
        attemptNumber: lead.getAttemptCount(),
      },
    });

    return saved;
  }
}
