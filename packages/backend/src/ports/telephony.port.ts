import { Call } from '@psynq/core';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import { BridgeOptions } from '../interfaces/bridge-options.interface';
import { Readable } from 'stream';

import { TelephonyCapabilities } from '../interfaces/telephony-capabilities.interface';

export interface TelephonyPort {
  /**
   * Generates a provider-specific token or credentials for a client/agent.
   */
  generateToken(organizationId: string | null, agentId: string): Promise<any>;

  /**
   * Performs a health check on the telephony provider.
   */
  healthCheck(organizationId: string | null): Promise<boolean>;

  /**
   * Return provider capabilities so callers can adapt behavior instead
   * of branching on provider names.
   */
  getCapabilities(): TelephonyCapabilities;

  /**
   * Initiates an outbound call. Implementations may return the provider's external call ID (e.g., ARI channel ID).
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
   * Dial the second leg of a call and join it to a bridge.
   */
  dialLegB(organizationId: string | null, callId: string, bridgeId: string, destination: string): Promise<void>;

  /**
   * Joins a channel to a bridge.
   */
  joinBridge(organizationId: string | null, bridgeId: string, channelId: string): Promise<void>;

  /**
   * Starts recording a bridge.
   */
  startBridgeRecording(organizationId: string | null, bridgeId: string, callId: string): Promise<void>;

  /**
   * Stops recording a bridge and uploads it.
   */
  stopBridgeRecording(organizationId: string | null, bridgeId: string, callId: string): Promise<void>;

  /**
   * Plays an audio file to a channel.
   */
  playAudio(organizationId: string | null, callId: string, url: string): Promise<void>;

  /**
   * Uses Text-to-Speech to speak to a channel.
   */
  sayText(organizationId: string | null, callId: string, text: string): Promise<void>;

  /**
   * Starts gathering DTMF digits from a channel.
   */
  gatherDigits(organizationId: string | null, callId: string, options: { maxDigits: number, timeout: number, finishOnKey: string }): Promise<void>;

  /**
   * Forks the audio of a channel to an external RTP destination.
   */
  forkAudio(organizationId: string | null, callId: string, destination: string): Promise<void>;

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