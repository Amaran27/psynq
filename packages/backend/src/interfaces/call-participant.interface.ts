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
   * Whether supervisor can hear the conversation when muted
   */
  canHearWhenMuted?: boolean;
}