import { TranscriptionProvider } from '../transcription.domain';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  segments: Array<{
    startTime: number;
    endTime: number;
    text: string;
    confidence: number;
  }>;
  language: string;
  metadata?: Record<string, any>;
}

export interface STTProviderConfig {
  provider: TranscriptionProvider;
  apiKey?: string;
  region?: string;
  model?: string;
  language?: string;
  enableTimestamps?: boolean;
  enableSpeakerDiarization?: boolean;
  maxAlternatives?: number;
}

export interface STTProvider {
  /**
   * Get the provider name
   */
  getProviderName(): TranscriptionProvider;

  /**
   * Transcribe audio from a URL
   */
  transcribe(audioUrl: string, config?: STTProviderConfig): Promise<TranscriptionResult>;

  /**
   * Transcribe audio from a buffer
   */
  transcribeBuffer(audioBuffer: Buffer, audioFormat: string, config?: STTProviderConfig): Promise<TranscriptionResult>;

  /**
   * Transcribe audio stream in real-time
   */
  transcribeStream(audioStream: NodeJS.ReadableStream, config?: STTProviderConfig): AsyncIterable<TranscriptionResult>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Promise<string[]>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

export const STT_PROVIDER_PORT = Symbol('STT_PROVIDER_PORT');
