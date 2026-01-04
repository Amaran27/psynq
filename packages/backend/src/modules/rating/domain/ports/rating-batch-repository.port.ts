import { RatingBatch, BatchStatus } from '../rating-batch.domain';

export const RATING_BATCH_REPOSITORY_PORT = 'RATING_BATCH_REPOSITORY_PORT';

export interface FindRatingBatchesFilter {
  organizationId?: string;
  status?: BatchStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface RatingBatchRepository {
  create(ratingBatch: RatingBatch): Promise<RatingBatch>;
  findById(id: string): Promise<RatingBatch | null>;
  findAll(filter?: FindRatingBatchesFilter): Promise<RatingBatch[]>;
  findByOrganization(organizationId: string): Promise<RatingBatch[]>;
  findPending(organizationId: string): Promise<RatingBatch[]>;
  findProcessing(): Promise<RatingBatch[]>;
  update(ratingBatch: RatingBatch): Promise<RatingBatch>;
  delete(id: string): Promise<void>;
  count(filter?: FindRatingBatchesFilter): Promise<number>;
}
