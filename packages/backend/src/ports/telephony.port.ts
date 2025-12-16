import { Call } from '@psynq/core';

export interface TelephonyPort {
  /**
   * Initiates an outbound call. Implementations may return the provider's external call ID (e.g., Twilio SID).
   */
  createCall(call: Call): Promise<string | void>;
  bridgeCall(callId: string, agentId: string): Promise<void>;
  injectSupervisor(callId: string, supervisorId: string): Promise<string | void>;
  // Set muted state for a participant (e.g., supervisor) in a conference. Implementations may
  // use conference naming conventions; callId is the internal call id used to derive conference name.
  setParticipantMuted(callId: string, participantSid: string, muted: boolean): Promise<void>;
  endCall(callId: string): Promise<void>;
}