/**
 * Recording Repository Port (Interface)
 */

import { Recording } from '../domain/recording.entity';

export interface RecordingSearchFilters {
  organizationId?: string;
  callId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface RecordingRepositoryPort {
  /**
   * Create a new recording
   */
  create(recording: Recording): Promise<Recording>;

  /**
   * Find recording by ID
   */
  findById(id: string): Promise<Recording | null>;

  /**
   * Find recording by call ID
   */
  findByCallId(callId: string): Promise<Recording | null>;

  /**
   * Find recordings with filters and pagination
   */
  find(filters: RecordingSearchFilters, limit?: number, offset?: number): Promise<Recording[]>;

  /**
   * Count recordings matching filters
   */
  count(filters: RecordingSearchFilters): Promise<number>;

  /**
   * Update recording
   */
  update(recording: Recording): Promise<Recording>;

  /**
   * Delete recording (soft delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Hard delete recording (remove from database)
   */
  hardDelete(id: string): Promise<void>;
}
