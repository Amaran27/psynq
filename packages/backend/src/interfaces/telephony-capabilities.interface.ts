export interface TelephonyCapabilities {
  supportsSupervisorInjection: boolean;
  supportsParticipantMute: boolean;
  supportsParticipantHold: boolean;
  supportsBridgeCall: boolean;
  supportsTransfer?: boolean;
}