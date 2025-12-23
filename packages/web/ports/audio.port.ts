export interface AudioDeviceStatus {
  isReady: boolean;
  isMuted: boolean;
  activeCallId?: string;
}

export interface AudioPort {
  /**
   * Initializes the audio device with provider-specific configuration
   */
  initialize(config: any): Promise<void>;

  /**
   * Connects an outbound call or accepts an incoming one
   */
  connect(target: string, options?: any): Promise<void>;

  /**
   * Disconnects the active call
   */
  disconnect(): Promise<void>;

  /**
   * Mutes or unmutes the local audio
   */
  setMuted(muted: boolean): Promise<void>;

  /**
   * Registers a callback for incoming calls
   */
  onIncomingCall(callback: (callId: string, from: string) => void): void;

  /**
   * Registers a callback for call status changes
   */
  onStatusChange(callback: (status: AudioDeviceStatus) => void): void;

  /**
   * Cleanup resources
   */
  destroy(): Promise<void>;
}
