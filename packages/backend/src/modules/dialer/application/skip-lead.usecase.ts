/**
 * Skip Lead Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Allows agent to skip a lead in preview dialing mode
 */

import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Lead, LeadStatus } from '../domain/lead.domain';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';
import { 
  DialingSessionRepositoryPort, 
  DIALING_SESSION_REPOSITORY_PORT 
} from '../ports/dialing-session-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';

export interface SkipLeadInput {
  leadId: string;
  agentId: string;
  dialingSessionId: string; // Need to get session for organizationId
  reason?: string; // Optional: why agent skipped (e.g., "bad timing", "wrong number", etc.)
}

/**
 * Skip Lead Workflow:
 * 1. Agent reviews lead and decides not to call now
 * 2. System marks lead as SKIPPED
 * 3. Lead goes back to queue with lower priority
 * 4. Another agent or same agent may see it later
 * 5. System fetches next available lead for agent
 */
@Injectable()
export class SkipLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT)
    private readonly leadRepository: LeadRepositoryPort,
    @Inject(DIALING_SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: DialingSessionRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: SkipLeadInput): Promise<Lead> {
    // Get the lead
    const lead = await this.leadRepository.findById(input.leadId);
    if (!lead) {
      throw new NotFoundException(`Lead ${input.leadId} not found`);
    }

    // Ensure lead is assigned to this agent
    if (lead.assignedAgentId !== input.agentId) {
      throw new BadRequestException('Lead is not assigned to this agent');
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

    // Mark lead as skipped (unassign and return to NEW status)
    lead.status = LeadStatus.NEW;
    lead.assignedAgentId = undefined;
    lead.priority = Math.max(1, lead.priority - 1); // Lower priority slightly
    lead.nextAttemptAt = new Date(Date.now() + 15 * 60 * 1000); // Retry after 15 minutes

    // Save lead
    const updated = await this.leadRepository.save(lead);

    // Update session stats
    session.recordLeadSkipped();
    await this.sessionRepository.save(session);

    // Publish event
    this.eventBus.publish({
      type: 'lead.skipped',
      organizationId: session.organizationId || 'unknown',
      payload: {
        leadId: lead.id,
        campaignId: lead.campaignId,
        agentId: input.agentId,
        reason: input.reason,
        sessionId: session.id,
      },
      timestamp: new Date(),
    });

    return updated;
  }
}
