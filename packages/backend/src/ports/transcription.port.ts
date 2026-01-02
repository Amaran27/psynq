export interface TranscriptionEvent {
  callId: string;
  text: string;
  isFinal: boolean;
  speaker?: string;
  confidence: number;
}

export interface TranscriptionPort {
  /**
   * Starts a real-time transcription session for a call
   */
  startTranscription(
    orgId: string,
    callId: string,
    callback: (event: TranscriptionEvent) => void,
  ): Promise<void>;

  /**
   * Stops the transcription session
   */
  stopTranscription(callId: string): Promise<void>;
}
