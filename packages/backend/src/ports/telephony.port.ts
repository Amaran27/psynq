import { Call } from '@psynq/core';

export interface TelephonyPort {
  createCall(call: Call): Promise<void>;
  bridgeCall(callId: string, agentId: string): Promise<void>;
  injectSupervisor(callId: string, supervisorId: string): Promise<void>;
  endCall(callId: string): Promise<void>;
}