import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusPort, PsynqEvent } from '../ports/event-bus.port';
import { TelephonyPort } from '../ports/telephony.port';
import { AgentStateService } from './agent-state.service';
import { QueueService } from './queue.service';
import { FlowService } from './flow.service';
import { FlowExecutorService } from './flow-executor.service';
import { TranscriptionPort } from '../ports/transcription.port';
import { IntelligenceService } from './intelligence.service';
import { AgentStatus } from '@psynq/core';

@Injectable()
export class CallOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(CallOrchestratorService.name);

  constructor(
    @Inject('EVENT_BUS') private readonly eventBus: EventBusPort,
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
    @Inject('TRANSCRIPTION_PROVIDER')
    private readonly transcriptionProvider: TranscriptionPort,
    private readonly agentStateService: AgentStateService,
    private readonly queueService: QueueService,
    private readonly flowService: FlowService,
    private readonly flowExecutorService: FlowExecutorService,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  async onModuleInit() {
    await this.eventBus.subscribe('telephony.call_received', (event) =>
      this.handleInboundCall(event),
    );
    await this.eventBus.subscribe('telephony.channel_entered', (event) =>
      this.handleChannelEntered(event),
    );
    await this.eventBus.subscribe('telephony.channel_hungup', (event) =>
      this.handleChannelHungup(event),
    );
    await this.eventBus.subscribe('telephony.dtmf_received', (event) =>
      this.handleDtmfReceived(event),
    );
  }

  /**
   * NEW INBOUND FLOW: Execute Organization Workflow (IVR)
   */
  private async handleInboundCall(event: PsynqEvent) {
    const call = event.payload;
    const orgId = event.organizationId;

    this.logger.log(
      `Inbound Call ${call.id} for org ${orgId}. Executing flow...`,
    );

    const flow = await this.flowService.getDefaultFlowForOrg(orgId);
    if (flow) {
      await this.flowExecutorService.executeStep(
        orgId,
        call.id,
        flow,
        flow.definition.startNode,
      );
    } else {
      // Fallback to direct queue routing if no flow defined
      this.logger.warn(
        `No flow defined for org ${orgId}. Routing to default queue.`,
      );
      await this.routeToQueue(orgId, call);
    }
  }

  private async routeToQueue(orgId: string, call: any) {
    const queue = await this.queueService.findQueueForNumber(orgId, call.to);
    const agent = await this.agentStateService.getBestAvailableAgent(
      orgId,
      queue?.requiredSkills || [],
    );

    if (agent) {
      await this.telephonyProvider.createCall({ ...call, agentId: agent.id });
      await this.agentStateService.setStatus(agent.id, AgentStatus.BUSY);
    }
  }

  private async handleDtmfReceived(event: PsynqEvent) {
    // Logic to resume flow execution based on digits
    this.logger.debug(
      `DTMF Received: ${event.payload.digit} for Call: ${event.payload.callId}`,
    );
  }

  private async handleChannelEntered(event: PsynqEvent) {
    const { channelId, callId, role, bridgeId, destination } = event.payload;
    const orgId = event.organizationId;

    if (role === 'agent' && bridgeId) {
      await this.telephonyProvider.joinBridge(orgId, bridgeId, channelId);
      if (destination) {
        // This was an outbound call (Leg A answered, now dial Customer)
        await this.telephonyProvider.dialLegB(
          orgId,
          callId,
          bridgeId,
          destination,
        );
      }
    } else if (role === 'customer' && bridgeId) {
      await this.telephonyProvider.joinBridge(orgId, bridgeId, channelId);
      await this.telephonyProvider.startBridgeRecording(
        orgId,
        bridgeId,
        callId,
      );

      // Start Real-Time AI Coaching (Giant Gap Feature)
      await this.transcriptionProvider.startTranscription(
        orgId,
        callId,
        async (event) => {
          if (event.isFinal) {
            // Resolve agentId from the bridge/call context
            const agentId = 'TODO_RESOLVE_AGENT_ID';
            await this.intelligenceService.analyzeSnippet(
              orgId,
              callId,
              agentId,
              event.text,
            );
          }
        },
      );
    }
  }

  private async handleChannelHungup(event: PsynqEvent) {
    const { channelId, callId, bridgeId, role, userId } = event.payload;
    const orgId = event.organizationId;

    if (bridgeId) {
      await this.telephonyProvider.stopBridgeRecording(orgId, bridgeId, callId);
    }

    if (role === 'customer') {
      await this.transcriptionProvider.stopTranscription(callId);
    }

    // Auto-transition agent to WRAP_UP when they finish a call
    if (role === 'agent' && userId) {
      await this.agentStateService.setStatus(userId, AgentStatus.WRAP_UP);

      // Auto-set back to AVAILABLE after 30 seconds (standard wrap-up time)
      setTimeout(async () => {
        await this.agentStateService.setStatus(userId, AgentStatus.AVAILABLE);
      }, 30000);
    }
  }
}
