import { UsageRecord, UsageType, RatingStatus } from '../usage-record.domain';

export const USAGE_RECORD_REPOSITORY_PORT = 'USAGE_RECORD_REPOSITORY_PORT';

export interface FindUsageRecordsFilter {
  organizationId?: string;
  customerId?: string;
  ratePlanId?: string;
  walletId?: string;
  usageType?: UsageType;
  ratingStatus?: RatingStatus;
  campaignId?: string;
  ratingBatchId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UsageRecordRepository {
  create(usageRecord: UsageRecord): Promise<UsageRecord>;
  findById(id: string): Promise<UsageRecord | null>;
  findAll(filter?: FindUsageRecordsFilter): Promise<UsageRecord[]>;
  findPendingRating(organizationId: string, limit?: number): Promise<UsageRecord[]>;
  findByCustomer(organizationId: string, customerId: string, startDate?: Date, endDate?: Date): Promise<UsageRecord[]>;
  findByRatePlan(ratePlanId: string): Promise<UsageRecord[]>;
  findByBatch(ratingBatchId: string): Promise<UsageRecord[]>;
  update(usageRecord: UsageRecord): Promise<UsageRecord>;
  bulkUpdate(usageRecords: UsageRecord[]): Promise<void>;
  delete(id: string): Promise<void>;
  count(filter?: FindUsageRecordsFilter): Promise<number>;
  sumTotalCost(filter?: FindUsageRecordsFilter): Promise<number>;
}
