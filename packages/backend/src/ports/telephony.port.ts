import { Call } from '@psynq/core';

export interface TelephonyPort {
  /**
   * Initiates an outbound call. Implementations may return the provider's external call ID (e.g., Twilio SID).
   */
  createCall(call: Call): Promise<string | void>;
  bridgeCall(callId: string, agentId: string): Promise<void>;
  injectSupervisor(callId: string, supervisorId: string): Promise<void>;
  endCall(callId: string): Promise<void>;
}