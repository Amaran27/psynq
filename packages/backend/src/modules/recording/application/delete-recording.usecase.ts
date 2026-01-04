/**
 * Delete Recording Use Case
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { RecordingRepositoryPort } from '../ports/recording-repository.port';
import { StorageService } from '../../storage/storage.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class DeleteRecordingUseCase {
  private readonly logger = new Logger(DeleteRecordingUseCase.name);

  constructor(
    @Inject('RECORDING_REPOSITORY')
    private readonly recordingRepository: RecordingRepositoryPort,
    private readonly storageService: StorageService,
  ) {}

  async execute(id: string, hardDelete: boolean = false): Promise<void> {
    const recording = await this.recordingRepository.findById(id);

    if (!recording) {
      throw new NotFoundException(`Recording with ID ${id} not found`);
    }

    if (hardDelete) {
      // Delete from storage
      try {
        await this.storageService.deleteFile(recording.filePath, recording.organizationId);
      } catch (error) {
        this.logger.warn(`Failed to delete file from storage: ${error.message}`);
      }

      // Hard delete from database
      await this.recordingRepository.hardDelete(id);
      this.logger.log(`Recording ${id} permanently deleted`);
    } else {
      // Soft delete (mark as deleted)
      recording.markDeleted();
      await this.recordingRepository.update(recording);
      this.logger.log(`Recording ${id} marked as deleted`);
    }
  }
}
