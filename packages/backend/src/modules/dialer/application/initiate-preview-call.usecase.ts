/**
 * Initiate Preview Call Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Agent manually initiates call after reviewing lead
 */

import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Lead, LeadStatus } from '../domain/lead.domain';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';
import { 
  DialingSessionRepositoryPort, 
  DIALING_SESSION_REPOSITORY_PORT 
} from '../ports/dialing-session-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';

export interface InitiatePreviewCallInput {
  leadId: string;
  agentId: string;
  dialingSessionId: string;
}

export interface InitiatePreviewCallOutput {
  lead: Lead;
  callInitiated: boolean;
  message: string;
}

/**
 * Initiate Preview Call Workflow:
 * 1. Agent reviews lead and clicks "DIAL"
 * 2. System validates lead and agent state
 * 3. System initiates outbound call to lead's phone number
 * 4. System marks lead as DIALING
 * 5. When call connects, agent is bridged with customer
 * 6. After call ends, agent completes disposition
 * 
 * Note: Actual call initiation happens via telephony adapter (Asterisk)
 * This use case only updates lead status and triggers call event
 */
@Injectable()
export class InitiatePreviewCallUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT)
    private readonly leadRepository: LeadRepositoryPort,
    @Inject(DIALING_SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: DialingSessionRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: InitiatePreviewCallInput): Promise<InitiatePreviewCallOutput> {
    // Get the lead
    const lead = await this.leadRepository.findById(input.leadId);
    if (!lead) {
      throw new NotFoundException(`Lead ${input.leadId} not found`);
    }

    // Ensure lead is assigned to this agent
    if (lead.assignedAgentId !== input.agentId) {
      throw new BadRequestException('Lead is not assigned to this agent');
    }

    // Ensure lead is in valid state for dialing
    if (lead.status !== LeadStatus.ASSIGNED) {
      throw new BadRequestException(`Lead is not in ASSIGNED state (current: ${lead.status})`);
    }

    // Check if there's an active preview session
    const session = await this.sessionRepository.findById(input.dialingSessionId);
    if (!session) {
      throw new NotFoundException(`Dialing session ${input.dialingSessionId} not found`);
    }

    // Verify agent is in the session
    if (!session.activeAgentIds.includes(input.agentId)) {
      throw new BadRequestException('Agent is not part of this dialing session');
    }

    // Mark lead as dialing
    lead.status = LeadStatus.DIALING;
    lead.lastAttemptAt = new Date();
    
    // Save lead
    const updated = await this.leadRepository.save(lead);

    // Update session stats
    session.recordCallInitiated();
    await this.sessionRepository.save(session);

    // Publish event for telephony system to initiate actual call
    this.eventBus.publish({
      type: 'preview_call.initiated',
      organizationId: session.organizationId || 'unknown',
      payload: {
        leadId: lead.id,
        campaignId: lead.campaignId,
        agentId: input.agentId,
        phoneNumber: lead.phoneNumber,
        sessionId: session.id,
        customerName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      },
      timestamp: new Date(),
    });

    return {
      lead: updated,
      callInitiated: true,
      message: `Call to ${lead.phoneNumber} initiated`,
    };
  }
}
