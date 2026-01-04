/**
 * Get Recording Use Case
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { RecordingRepositoryPort } from '../ports/recording-repository.port';
import { Recording } from '../domain/recording.entity';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class GetRecordingUseCase {
  constructor(
    @Inject('RECORDING_REPOSITORY')
    private readonly recordingRepository: RecordingRepositoryPort,
    private readonly storageService: StorageService,
  ) {}

  async execute(id: string, generateUrl: boolean = true): Promise<{ recording: Recording; url?: string }> {
    const recording = await this.recordingRepository.findById(id);

    if (!recording) {
      throw new NotFoundException(`Recording with ID ${id} not found`);
    }

    if (!recording.isAvailable()) {
      throw new NotFoundException(`Recording ${id} is not available`);
    }

    let url: string | undefined;
    if (generateUrl) {
      // Generate presigned URL for download (valid for 1 hour)
      url = await this.storageService.getPresignedUrl(
        recording.filePath,
        recording.organizationId,
        3600,
      );
    }

    return { recording, url };
  }
}
