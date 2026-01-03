/**
 * IVR Orchestrator Service
 * 
 * Listens for inbound calls and starts IVR flows
 */

import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusPort } from '../../../ports/event-bus.port';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { ExecuteIVRFlowUseCase } from '../application/execute-ivr-flow.usecase';

@Injectable()
export class IVROrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(IVROrchestratorService.name);

  constructor(
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
    @Inject('IVR_FLOW_REPOSITORY')
    private readonly flowRepository: IVRFlowRepositoryPort,
    private readonly executeFlowUseCase: ExecuteIVRFlowUseCase,
  ) {}

  async onModuleInit() {
    // Subscribe to inbound call events
    this.eventBus.subscribe('call.inbound', this.handleInboundCall.bind(this));
    this.logger.log('IVR Orchestrator initialized - listening for inbound calls');
  }

  /**
   * Handle inbound call - start IVR flow
   */
  private async handleInboundCall(event: any): Promise<void> {
    const call = event.payload;
    const organizationId = event.organizationId;

    this.logger.log(`Inbound call ${call.id} for org ${organizationId} - starting IVR`);

    try {
      // Find active flow for organization
      const flows = await this.flowRepository.findByOrganization(organizationId, 'active' as any);
      
      if (flows.length === 0) {
        this.logger.warn(`No active IVR flow for org ${organizationId}`);
        // Fallback: queue to default queue
        await this.eventBus.publish({
          type: 'call.queued',
          organizationId,
          payload: {
            callId: call.id,
            queueName: 'default',
            priority: 0,
          },
          timestamp: new Date(),
        });
        return;
      }

      // Use first active flow (later: support routing rules)
      const flow = flows[0];
      this.logger.log(`Executing IVR flow ${flow.id} (${flow.name}) for call ${call.id}`);

      // Start flow execution
      await this.executeFlowUseCase.execute(
        call.id,
        flow.id,
        organizationId,
        {
          caller: call.from,
          callee: call.to,
          direction: 'inbound',
        },
      );
    } catch (error) {
      this.logger.error(`IVR execution failed for call ${call.id}:`, error);
      
      // Fallback: queue to default queue
      await this.eventBus.publish({
        type: 'call.queued',
        organizationId,
        payload: {
          callId: call.id,
          queueName: 'default',
          priority: 0,
        },
        timestamp: new Date(),
      });
    }
  }
}
