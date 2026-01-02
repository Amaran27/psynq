export interface CallParticipant {
  id: string;
  callId: string;
  participantId: string;
  participantType: 'agent' | 'customer' | 'supervisor';
  providerCallSid?: string;
  providerSpecificData?: Record<string, any>;
  isMuted: boolean;
  isOnHold: boolean;
  joinedAt: Date;
  leftAt?: Date;
}

export interface SupervisorControlOptions {
  /**

   * Initial mute state for supervisor (true = whisper mode, false = barge-in mode)

   */

  initialMuteState?: boolean;

  /**

   * Supervisor mode: 'barge' (speak to all), 'whisper' (speak to agent only), 'monitor' (listen only).

   * Defaults to 'monitor' if initialMuteState is true, or 'barge' if false?

   * Explicit mode is better.

   */

  mode?: 'barge' | 'whisper' | 'monitor';

  /**

   * Whether supervisor can hear the conversation when muted

   */

  canHearWhenMuted?: boolean;
}
