import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DialingSession, DialingMode, SessionStatus } from '../domain/dialing-session.domain';
import { DialingSessionRepositoryPort, DIALING_SESSION_REPOSITORY_PORT } from '../ports/dialing-session-repository.port';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';
import { PredictivePacerService, CallMetrics, PacingDecision } from './predictive-pacer.service';
import { CallService } from '../../call/call.service';
import { CreateCallDto } from '../../../dtos/call.dto';

@Injectable()
export class PredictiveDialingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PredictiveDialingService.name);
  private dialingLoopInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly LOOP_INTERVAL_MS = 2000; // Check every 2 seconds

  constructor(
    @Inject(DIALING_SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: DialingSessionRepositoryPort,
    @Inject(LEAD_REPOSITORY_PORT)
    private readonly leadRepository: LeadRepositoryPort,
    private readonly pacerService: PredictivePacerService,
    private readonly callService: CallService,
  ) {}

  onModuleInit() {
    this.startDialingLoop();
  }

  onModuleDestroy() {
    this.stopDialingLoop();
  }

  private startDialingLoop() {
    if (this.dialingLoopInterval) return;
    this.logger.log('Starting predictive dialing loop...');
    this.dialingLoopInterval = setInterval(() => this.processDialingCycle(), this.LOOP_INTERVAL_MS);
  }

  private stopDialingLoop() {
    if (this.dialingLoopInterval) {
      clearInterval(this.dialingLoopInterval);
      this.dialingLoopInterval = null;
      this.logger.log('Stopped predictive dialing loop');
    }
  }

  /**
   * Main dialing cycle
   * 1. Find all active predictive sessions
   * 2. For each session, calculate pacing
   * 3. Fetch leads
   * 4. Dispatch calls
   */
  private async processDialingCycle() {
    if (this.isRunning) return; // Prevent overlapping cycles
    this.isRunning = true;

    try {
      // Find all active predictive sessions
      // We might need to extend the repository to find by status and mode, 
      // but for now we can fetch all active and filter
      // Assuming findAll supports filtering by status
      const sessions = await this.sessionRepository.findAll({ 
        status: SessionStatus.ACTIVE 
      });

      const predictiveSessions = sessions.filter(s => s.mode === DialingMode.PREDICTIVE);

      for (const session of predictiveSessions) {
        await this.processSession(session);
      }
    } catch (error) {
      this.logger.error(`Error in dialing cycle: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  private async processSession(session: DialingSession) {
    try {
      // 1. Gather Metrics
      const metrics = await this.gatherMetrics(session);

      // 2. Calculate Pacing
      const decision = this.pacerService.calculatePacing(
        metrics,
        session.pacingConfig,
        session.stats
      );

      if (!decision.shouldDial || decision.recommendedCalls <= 0) {
        // Log occasionally or if debug enabled
        // this.logger.debug(`Session ${session.id}: No dial - ${decision.reason}`);
        return;
      }

      this.logger.log(`Session ${session.id}: Placing ${decision.recommendedCalls} calls. Reason: ${decision.reason}`);

      // 3. Fetch Leads
      const leads = await this.leadRepository.findDialableLeads(
        session.campaignId,
        3, // Max attempts (TODO: Make configurable from campaign)
        decision.recommendedCalls
      );

      if (leads.length === 0) {
        this.logger.debug(`Session ${session.id}: No dialable leads found`);
        // Potentially pause session if no leads?
        return;
      }

      // 4. Dispatch Calls
      const callsToMake = Math.min(leads.length, decision.recommendedCalls);
      
      for (let i = 0; i < callsToMake; i++) {
        const lead = leads[i];
        await this.dispatchCall(session, lead);
      }

    } catch (error) {
      this.logger.error(`Error processing session ${session.id}: ${error.message}`, error.stack);
    }
  }

  private async gatherMetrics(session: DialingSession): Promise<CallMetrics> {
    // In a real implementation, this would query the CallService/Repository/Redis for real-time stats
    // For now, we estimate based on session stats and some assumptions or methods we'd need to add
    
    // We need to know:
    // - Active calls for this session (or campaign)
    // - Active agents for this session
    // - Available agents (idle)
    
    // Using CallService to get active calls
    // We assume CallService.getActiveCalls returns all calls. We filter by campaign/org if possible.
    // Ideally CallService should support filtering.
    const activeCalls = await this.callService.getActiveCalls();
    
    // Filter calls related to this campaign (assuming metadata or correlation)
    // This is a naive implementation; optimized queries should be used in production
    // We assume there is a way to link calls to campaigns, e.g., via metadata or custom fields
    // For now, let's assume all outbound calls from this org are relevant if we don't have campaign ID on call
    
    // Note: The Call entity has `providerMetadata` or `externalId`. 
    // We should probably store campaignId in `providerMetadata` or `call.organizationId` matches.
    
    const sessionCalls = activeCalls.filter(c => 
      (c as any).organizationId === session.organizationId && 
      c.direction === 'outbound' 
      // && c.campaignId === session.campaignId // If we had this field
    );

    const callsInProgress = sessionCalls.length;
    const answeredCalls = sessionCalls.filter(c => c.state === 'answered').length; // 'answered' or equivalent enum

    // Agents
    // We need AgentStateService to get real availability. 
    // For now, we use session.activeAgentIds and assume some availability
    // TODO: Inject AgentStateService
    
    const activeAgents = session.activeAgentIds.length;
    // Mock availability: assume 20% are available if we can't check real status yet
    // Or simpler: calculate (Active Agents - (Answered Calls))
    const availableAgents = Math.max(0, activeAgents - answeredCalls); 

    return {
      totalCalls: session.stats.callsAttempted,
      answeredCalls: session.stats.callsAnswered,
      abandonedCalls: session.stats.callsAbandoned,
      avgHandleTimeSeconds: session.stats.avgTalkTimeSeconds || 120, // Default 2 mins
      activeAgents,
      availableAgents,
      callsInProgress,
    };
  }

  private async dispatchCall(session: DialingSession, lead: any) {
    try {
      const createCallDto = new CreateCallDto();
      createCallDto.to = lead.phoneNumber;
      createCallDto.from = 'system'; // Should be configured caller ID
      createCallDto.organizationId = session.organizationId;
      // createCallDto.campaignId = session.campaignId; // If DTO supports it
      
      // We don't assign an agent yet for predictive dialing (usually)
      // Or we assign a "queue" or "placeholder". 
      // If CallService requires agentId, we might have an issue.
      // CallService.createCall: agentId is optional.
      
      // We start the call. When answered, we bridge to an available agent.
      // This logic ("AMD" - Answering Machine Detection) and Bridging is handled by the media server / flow.
      // Here we just initiate.
      
      await this.callService.createCall(createCallDto);
      
      session.recordCallAttempt();
      // Update session stats
      await this.sessionRepository.save(session);
      
    } catch (error) {
      this.logger.error(`Failed to dispatch call to ${lead.phoneNumber}: ${error.message}`);
    }
  }
}
