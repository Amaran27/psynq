import { Call } from '@psynq/core';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import { Readable } from 'stream';

import { TelephonyCapabilities } from '../interfaces/telephony-capabilities.interface';

export interface TelephonyPort {
  /**
   * Return provider capabilities so callers can adapt behavior instead
   * of branching on provider names.
   */
  getCapabilities(): TelephonyCapabilities;

  /**
   * Initiates an outbound call. Implementations may return the provider's external call ID (e.g., Twilio SID).
   */
  createCall(call: Call): Promise<string | void>;
  
  /**
   * Bridges a call to an agent. Provider-specific implementation.
   */
  bridgeCall(callId: string, agentId: string): Promise<void>;
  
  /**
   * Injects a supervisor into an active call. 
   * Returns participant information that can be used for later operations.
   * This should work with any provider's implementation, not just conferences.
   */
  injectSupervisor(callId: string, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant | void>;
  
  /**
   * Updates a participant's mute state.
   * Implementation should work with the provider's specific mechanism for mute control.
   */
  setParticipantMuted(participantId: string, muted: boolean): Promise<void>;
  
  /**
   * Updates a participant's hold state.
   */
  setParticipantOnHold(participantId: string, onHold: boolean): Promise<void>;
  
  /**
   * Ends a call and disconnects all participants.
   */
  endCall(callId: string): Promise<void>;
  
  /**
   * Retrieves the recording stream for a completed call, if available.
   * Returns null if no recording exists.
   */
  getRecording(callId: string): Promise<Readable | null>;
}