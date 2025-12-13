import { Injectable } from '@nestjs/common';
import { TelephonyPort } from '../ports/telephony.port';
import { Call } from '@psynq/core';

@Injectable()
export class AsteriskAdapter implements TelephonyPort {
  async createCall(call: Call): Promise<void> {
    // TODO: Implement ARI call creation
    console.log(`Creating call ${call.id} from ${call.from} to ${call.to}`);
  }

  async bridgeCall(callId: string, agentId: string): Promise<void> {
    // TODO: Implement call bridging
    console.log(`Bridging call ${callId} to agent ${agentId}`);
  }

  async injectSupervisor(callId: string, supervisorId: string): Promise<void> {
    // TODO: Implement supervisor injection
    console.log(`Injecting supervisor ${supervisorId} into call ${callId}`);
  }

  async endCall(callId: string): Promise<void> {
    // TODO: Implement call termination
    console.log(`Ending call ${callId}`);
  }
}