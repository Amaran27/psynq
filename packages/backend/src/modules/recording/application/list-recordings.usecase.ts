/**
 * List Recordings Use Case
 */

import { Injectable, Inject } from '@nestjs/common';
import { RecordingRepositoryPort, RecordingSearchFilters } from '../ports/recording-repository.port';
import { Recording } from '../domain/recording.entity';

export interface ListRecordingsResult {
  recordings: Recording[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class ListRecordingsUseCase {
  constructor(
    @Inject('RECORDING_REPOSITORY')
    private readonly recordingRepository: RecordingRepositoryPort,
  ) {}

  async execute(
    filters: RecordingSearchFilters,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ListRecordingsResult> {
    const [recordings, total] = await Promise.all([
      this.recordingRepository.find(filters, limit, offset),
      this.recordingRepository.count(filters),
    ]);

    return {
      recordings,
      total,
      limit,
      offset,
    };
  }
}
