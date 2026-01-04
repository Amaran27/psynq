/**
 * Recording Domain Entity (Pure TypeScript - No Framework Dependencies)
 * 
 * Business Rules:
 * - Recording must be associated with a call
 * - File path must be valid and accessible
 * - Duration must be non-negative
 * - Size must be positive
 * - Deleted recordings cannot be played back
 */

export enum RecordingStatus {
  UPLOADING = 'uploading',
  AVAILABLE = 'available',
  DELETED = 'deleted',
  FAILED = 'failed',
}

export enum RecordingFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  OGG = 'ogg',
}

export interface RecordingMetadata {
  codec?: string;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
}

export class Recording {
  id: string;
  callId: string;
  organizationId: string;
  filePath: string;
  fileName: string;
  format: RecordingFormat;
  duration: number; // seconds
  size: number; // bytes
  status: RecordingStatus;
  metadata?: RecordingMetadata;
  uploadedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Recording>) {
    Object.assign(this, data);
    this.validate();
  }

  private validate(): void {
    const errors: string[] = [];

    if (!this.callId) {
      errors.push('Recording must be associated with a call');
    }

    if (!this.organizationId) {
      errors.push('Recording must belong to an organization');
    }

    if (!this.filePath) {
      errors.push('Recording must have a file path');
    }

    if (this.duration !== undefined && this.duration < 0) {
      errors.push('Recording duration cannot be negative');
    }

    if (this.size !== undefined && this.size <= 0) {
      errors.push('Recording size must be positive');
    }

    if (errors.length > 0) {
      throw new Error(`Recording validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Mark recording as deleted
   */
  markDeleted(): void {
    this.status = RecordingStatus.DELETED;
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Check if recording is available for playback
   */
  isAvailable(): boolean {
    return this.status === RecordingStatus.AVAILABLE && !this.deletedAt;
  }

  /**
   * Update recording metadata after processing
   */
  updateMetadata(duration: number, size: number, metadata?: RecordingMetadata): void {
    this.duration = duration;
    this.size = size;
    this.metadata = metadata;
    this.status = RecordingStatus.AVAILABLE;
    this.uploadedAt = new Date();
    this.updatedAt = new Date();
  }
}
