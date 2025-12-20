import { Injectable, Inject, Logger } from '@nestjs/common';
import { FlowEntity, FlowNodeType, FlowStep } from '../entities/flow.entity';
import { TelephonyPort } from '../ports/telephony.port';

@Injectable()
export class FlowExecutorService {
  private readonly logger = new Logger(FlowExecutorService.name);

  constructor(
    @Inject('TELEPHONY_PROVIDER') private readonly telephonyProvider: TelephonyPort,
  ) {}

  async executeStep(orgId: string, callId: string, flow: FlowEntity, stepId: string) {
    const step = flow.definition.nodes.find(n => n.id === stepId);
    if (!step) {
      this.logger.warn(`Step ${stepId} not found in flow ${flow.id}`);
      return;
    }

    this.logger.debug(`Executing Flow Step: ${step.type} for Call: ${callId}`);

    switch (step.type) {
      case FlowNodeType.PLAY:
        await this.telephonyProvider.playAudio(orgId, callId, step.params.url);
        if (step.next) await this.executeStep(orgId, callId, flow, step.next);
        break;

      case FlowNodeType.SAY:
        // Text-to-Speech
        await this.telephonyProvider.sayText(orgId, callId, step.params.text);
        if (step.next) await this.executeStep(orgId, callId, flow, step.next);
        break;

      case FlowNodeType.GATHER:
        await this.telephonyProvider.gatherDigits(orgId, callId, {
          maxDigits: step.params.maxDigits || 1,
          timeout: step.params.timeout || 5000,
          finishOnKey: step.params.finishOnKey || '#'
        });
        // We don't call next here; we wait for the 'digits_gathered' event
        break;

      case FlowNodeType.DIAL_QUEUE:
        // This will trigger the ACD logic
        const queueId = step.params.queueId;
        // Logic to hand over to CallOrchestrator for Queue Routing
        break;

      case FlowNodeType.HANGUP:
        await this.telephonyProvider.endCall({ id: callId } as any);
        break;
    }
  }
}
