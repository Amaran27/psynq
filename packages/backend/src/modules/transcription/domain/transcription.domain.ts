export enum TranscriptionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TranscriptionProvider {
  WHISPER = 'whisper',
  GOOGLE = 'google',
  AZURE = 'azure',
  AWS = 'aws',
}

export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  FLAC = 'flac',
  OGG = 'ogg',
  M4A = 'm4a',
}

export class Transcription {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public audioUrl: string,
    public audioFormat: AudioFormat,
    public audioDurationSeconds: number,
    public audioSizeBytes: number,
    public provider: TranscriptionProvider,
    public language: string,
    public readonly callId?: string,
    public readonly recordingId?: string,
    public metadata?: Record<string, any>,
    public status: TranscriptionStatus = TranscriptionStatus.PENDING,
    public text?: string,
    public confidence?: number,
    public processingTimeMs?: number,
    public startedAt?: Date,
    public completedAt?: Date,
    public errorMessage?: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {
    this.validate();
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Transcription ID is required');
    }
    if (!this.organizationId || this.organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }
    if (!this.audioUrl || this.audioUrl.trim() === '') {
      throw new Error('Audio URL is required');
    }
    if (this.audioDurationSeconds < 0) {
      throw new Error('Audio duration must be non-negative');
    }
    if (this.audioSizeBytes < 0) {
      throw new Error('Audio size must be non-negative');
    }
    if (this.confidence !== undefined && (this.confidence < 0 || this.confidence > 1)) {
      throw new Error('Confidence must be between 0 and 1');
    }
    if (!this.language || this.language.trim() === '') {
      throw new Error('Language is required');
    }
  }

  startProcessing(): void {
    if (this.status !== TranscriptionStatus.PENDING) {
      throw new Error(`Cannot start processing: transcription is ${this.status}`);
    }
    this.status = TranscriptionStatus.PROCESSING;
    this.startedAt = new Date();
    this.errorMessage = undefined;
  }

  complete(text: string, confidence: number): void {
    if (this.status !== TranscriptionStatus.PROCESSING) {
      throw new Error(`Cannot complete: transcription is ${this.status}`);
    }
    this.status = TranscriptionStatus.COMPLETED;
    this.text = text;
    this.confidence = confidence;
    this.completedAt = new Date();
    this.errorMessage = undefined;

    if (this.startedAt) {
      this.processingTimeMs = this.completedAt.getTime() - this.startedAt.getTime();
    }
    this.validate();
  }

  fail(errorMessage: string): void {
    if (this.status !== TranscriptionStatus.PROCESSING) {
      throw new Error(`Cannot fail: transcription is ${this.status}`);
    }
    this.status = TranscriptionStatus.FAILED;
    this.errorMessage = errorMessage;
    this.completedAt = new Date();

    if (this.startedAt) {
      this.processingTimeMs = this.completedAt.getTime() - this.startedAt.getTime();
    }
  }

  retry(): void {
    if (this.status !== TranscriptionStatus.FAILED) {
      throw new Error(`Cannot retry: transcription is ${this.status}`);
    }
    this.status = TranscriptionStatus.PENDING;
    this.text = undefined;
    this.confidence = undefined;
    this.startedAt = undefined;
    this.completedAt = undefined;
    this.processingTimeMs = undefined;
    this.errorMessage = undefined;
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  isCompleted(): boolean {
    return this.status === TranscriptionStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === TranscriptionStatus.FAILED;
  }

  isProcessing(): boolean {
    return this.status === TranscriptionStatus.PROCESSING;
  }

  isPending(): boolean {
    return this.status === TranscriptionStatus.PENDING;
  }

  getProcessingDuration(): number | undefined {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return undefined;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      callId: this.callId,
      recordingId: this.recordingId,
      audioUrl: this.audioUrl,
      audioFormat: this.audioFormat,
      audioDurationSeconds: this.audioDurationSeconds,
      audioSizeBytes: this.audioSizeBytes,
      status: this.status,
      provider: this.provider,
      language: this.language,
      text: this.text,
      confidence: this.confidence,
      processingTimeMs: this.processingTimeMs,
      startedAt: this.startedAt?.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      errorMessage: this.errorMessage,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
