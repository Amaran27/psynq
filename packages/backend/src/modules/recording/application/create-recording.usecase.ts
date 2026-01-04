/**
 * Create Recording Use Case
 */

import { Injectable, Inject } from '@nestjs/common';
import { RecordingRepositoryPort } from '../ports/recording-repository.port';
import { Recording, RecordingFormat, RecordingStatus, RecordingMetadata } from '../domain/recording.entity';

export interface CreateRecordingDto {
  callId: string;
  organizationId: string;
  filePath: string;
  fileName: string;
  format?: RecordingFormat;
  duration?: number;
  size?: number;
  metadata?: RecordingMetadata;
}

@Injectable()
export class CreateRecordingUseCase {
  constructor(
    @Inject('RECORDING_REPOSITORY')
    private readonly recordingRepository: RecordingRepositoryPort,
  ) {}

  async execute(dto: CreateRecordingDto): Promise<Recording> {
    const recording = new Recording({
      callId: dto.callId,
      organizationId: dto.organizationId,
      filePath: dto.filePath,
      fileName: dto.fileName,
      format: dto.format || RecordingFormat.WAV,
      duration: dto.duration || 0,
      size: dto.size || 0,
      status: dto.duration ? RecordingStatus.AVAILABLE : RecordingStatus.UPLOADING,
      metadata: dto.metadata,
      uploadedAt: dto.duration ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.recordingRepository.create(recording);
  }
}
