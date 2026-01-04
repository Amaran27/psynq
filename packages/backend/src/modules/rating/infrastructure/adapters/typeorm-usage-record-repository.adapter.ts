import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageRecordRepository, FindUsageRecordsFilter } from '../../domain/ports/usage-record-repository.port';
import { UsageRecord } from '../../domain/usage-record.domain';
import { UsageRecordEntity } from '../persistence/usage-record.entity';

@Injectable()
export class TypeOrmUsageRecordRepositoryAdapter implements UsageRecordRepository {
  constructor(
    @InjectRepository(UsageRecordEntity)
    private readonly repository: Repository<UsageRecordEntity>,
  ) {}

  async create(usageRecord: UsageRecord): Promise<UsageRecord> {
    const entity = this.toEntity(usageRecord);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<UsageRecord | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindUsageRecordsFilter): Promise<UsageRecord[]> {
    const queryBuilder = this.repository.createQueryBuilder('usage');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.andWhere('usage.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.customerId) {
        queryBuilder.andWhere('usage.customer_id = :customerId', {
          customerId: filter.customerId,
        });
      }

      if (filter.ratePlanId) {
        queryBuilder.andWhere('usage.rate_plan_id = :ratePlanId', {
          ratePlanId: filter.ratePlanId,
        });
      }

      if (filter.walletId) {
        queryBuilder.andWhere('usage.wallet_id = :walletId', {
          walletId: filter.walletId,
        });
      }

      if (filter.usageType) {
        queryBuilder.andWhere('usage.usage_type = :usageType', {
          usageType: filter.usageType,
        });
      }

      if (filter.ratingStatus) {
        queryBuilder.andWhere('usage.rating_status = :ratingStatus', {
          ratingStatus: filter.ratingStatus,
        });
      }

      if (filter.campaignId) {
        queryBuilder.andWhere('usage.campaign_id = :campaignId', {
          campaignId: filter.campaignId,
        });
      }

      if (filter.ratingBatchId) {
        queryBuilder.andWhere('usage.rating_batch_id = :ratingBatchId', {
          ratingBatchId: filter.ratingBatchId,
        });
      }

      if (filter.startDate) {
        queryBuilder.andWhere('usage.start_time >= :startDate', {
          startDate: filter.startDate,
        });
      }

      if (filter.endDate) {
        queryBuilder.andWhere('usage.start_time <= :endDate', {
          endDate: filter.endDate,
        });
      }
    }

    queryBuilder.orderBy('usage.start_time', 'DESC');
    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findPendingRating(organizationId: string, limit?: number): Promise<UsageRecord[]> {
    const queryBuilder = this.repository.createQueryBuilder('usage');
    queryBuilder
      .where('usage.organization_id = :organizationId', { organizationId })
      .andWhere('usage.rating_status = :status', { status: 'pending' })
      .orderBy('usage.start_time', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByCustomer(
    organizationId: string,
    customerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UsageRecord[]> {
    return this.findAll({
      organizationId,
      customerId,
      startDate,
      endDate,
    });
  }

  async findByRatePlan(ratePlanId: string): Promise<UsageRecord[]> {
    const entities = await this.repository.find({
      where: { ratePlanId },
      order: { startTime: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByBatch(ratingBatchId: string): Promise<UsageRecord[]> {
    const entities = await this.repository.find({
      where: { ratingBatchId },
      order: { startTime: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(usageRecord: UsageRecord): Promise<UsageRecord> {
    const entity = this.toEntity(usageRecord);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async bulkUpdate(usageRecords: UsageRecord[]): Promise<void> {
    const entities = usageRecords.map((record) => this.toEntity(record));
    await this.repository.save(entities);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindUsageRecordsFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('usage');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.andWhere('usage.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.ratingStatus) {
        queryBuilder.andWhere('usage.rating_status = :ratingStatus', {
          ratingStatus: filter.ratingStatus,
        });
      }
    }

    return queryBuilder.getCount();
  }

  async sumTotalCost(filter?: FindUsageRecordsFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('usage');
    queryBuilder.select('SUM(usage.total_cost)', 'total');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.where('usage.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.customerId) {
        queryBuilder.andWhere('usage.customer_id = :customerId', {
          customerId: filter.customerId,
        });
      }

      if (filter.ratingStatus) {
        queryBuilder.andWhere('usage.rating_status = :ratingStatus', {
          ratingStatus: filter.ratingStatus,
        });
      }

      if (filter.startDate) {
        queryBuilder.andWhere('usage.start_time >= :startDate', {
          startDate: filter.startDate,
        });
      }

      if (filter.endDate) {
        queryBuilder.andWhere('usage.start_time <= :endDate', {
          endDate: filter.endDate,
        });
      }
    }

    const result = await queryBuilder.getRawOne();
    return parseFloat(result?.total || '0');
  }

  private toEntity(domain: UsageRecord): UsageRecordEntity {
    const entity = new UsageRecordEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.customerId = domain.customerId;
    entity.ratePlanId = domain.ratePlanId;
    entity.walletId = domain.walletId || null;
    entity.usageType = domain.usageType;
    entity.startTime = domain.startTime;
    entity.endTime = domain.endTime || null;
    entity.durationSeconds = domain.durationSeconds;
    entity.quantity = domain.quantity;
    entity.unitCost = domain.unitCost;
    entity.totalCost = domain.totalCost;
    entity.currency = domain.currency;
    entity.ratingStatus = domain.ratingStatus;
    entity.ratedAt = domain.ratedAt || null;
    entity.sourceNumber = domain.sourceNumber || null;
    entity.destinationNumber = domain.destinationNumber || null;
    entity.callId = domain.callId || null;
    entity.campaignId = domain.campaignId || null;
    entity.ratingBatchId = domain.ratingBatchId || null;
    entity.failureReason = domain.failureReason || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: UsageRecordEntity): UsageRecord {
    return new UsageRecord(
      entity.id,
      entity.organizationId,
      entity.customerId,
      entity.ratePlanId,
      entity.walletId ?? undefined,
      entity.usageType,
      entity.startTime,
      entity.endTime ?? undefined,
      entity.durationSeconds,
      entity.quantity,
      entity.unitCost,
      entity.totalCost,
      entity.currency,
      entity.ratingStatus,
      entity.ratedAt ?? undefined,
      entity.sourceNumber ?? undefined,
      entity.destinationNumber ?? undefined,
      entity.callId ?? undefined,
      entity.campaignId ?? undefined,
      entity.ratingBatchId ?? undefined,
      entity.failureReason ?? undefined,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
