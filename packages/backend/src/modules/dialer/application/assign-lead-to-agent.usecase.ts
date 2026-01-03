/**
 * Assign Lead To Agent Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Assigns the next available lead to an agent (Progressive mode)
 */

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Lead } from '../domain/lead.domain';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';
import { DialingSessionRepositoryPort, DIALING_SESSION_REPOSITORY_PORT } from '../ports/dialing-session-repository.port';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../../campaign/ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';

export interface AssignLeadInput {
  campaignId: string;
  agentId: string;
}

@Injectable()
export class AssignLeadToAgentUseCase {
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

  async execute(input: AssignLeadInput): Promise<Lead | null> {
    // Validate campaign exists
    const campaign = await this.campaignRepository.findById(input.campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${input.campaignId} not found`);
    }

    // Check active session
    const session = await this.sessionRepository.findActiveByCampaign(input.campaignId);
    if (!session) {
      throw new BadRequestException('No active dialing session for this campaign');
    }

    // Verify agent is in the session
    if (!session.activeAgentIds.includes(input.agentId)) {
      throw new BadRequestException('Agent is not part of this dialing session');
    }

    // Find next lead
    const lead = await this.leadRepository.findNextLeadForAgent(
      input.campaignId,
      input.agentId,
      campaign.maxAttempts,
    );

    if (!lead) {
      // No more leads available
      return null;
    }

    // Assign lead to agent
    lead.assign(input.agentId);

    // Save
    const saved = await this.leadRepository.save(lead);

    // Publish event
    this.eventBus.publish({
      type: 'lead.assigned',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: {
        leadId: saved.id,
        campaignId: input.campaignId,
        agentId: input.agentId,
        phoneNumber: saved.phoneNumber,
      },
    });

    return saved;
  }
}
