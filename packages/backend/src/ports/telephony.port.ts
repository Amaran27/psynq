import { Call } from '@psynq/core';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import { BridgeOptions } from '../interfaces/bridge-options.interface';
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
   * Bridges the call's primary participant with a target (e.g. agent).
   * Standardized replacement for bridgeCall.
   */
  bridgeParticipants(call: Call, targetIdentifier: string, options?: BridgeOptions): Promise<CallParticipant | void>;
  
  /**
   * Redirects a call to a new target (e.g. from queue to agent).
   */
  redirectCall?(call: Call, target: string): Promise<void>;
  
  /**
   * Injects a supervisor into an active call. 
   * Returns participant information that can be used for later operations.
   * This should work with any provider's implementation, not just conferences.
   */
  injectSupervisor(call: Call, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant | void>;
  
  /**
   * Updates a participant's mute state.
   */
  setParticipantMuted(organizationId: string | null, participantId: string, muted: boolean): Promise<void>;
  
  /**
   * Updates a participant's hold state.
   */
  setParticipantOnHold(organizationId: string | null, participantId: string, onHold: boolean): Promise<void>;
  
  /**
   * Ends a call and disconnects all participants.
   */
  endCall(call: Call): Promise<void>;
  
  /**
   * Retrieves the recording stream for a completed call, if available.
   * Returns null if no recording exists.
   */
  getRecording(callId: string): Promise<Readable | null>;
  
  /**
   * Finds a queue by name. Only applicable for providers that support queues.
   * Returns null for providers that don't support queues.
   */
  findQueueByName?(queueName: string): Promise<any | null>;
  
  /**
   * Gets the first call from a queue. Only applicable for providers that support queues.
   * Returns null for providers that don't support queues or if queue is empty.
   */
  getFirstCallFromQueue?(queueSid: string): Promise<any | null>;

  /**
   * Registers a callback for when a call is received (e.g. via WebSocket).
   */
  onCallReceived?(callback: (call: Call) => void): void;

  /**
   * Registers a callback for when a call is ended (e.g. via WebSocket).
   */
  onCallEnded?(callback: (callId: string) => void): void;

  /**
   * Registers a callback for when a participant joins a call/conference.
   */
  onParticipantJoined?(callback: (participant: CallParticipant) => void): void;
}