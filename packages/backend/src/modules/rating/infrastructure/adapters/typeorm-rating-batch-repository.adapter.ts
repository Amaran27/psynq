import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RatingBatchRepository, FindRatingBatchesFilter } from '../../domain/ports/rating-batch-repository.port';
import { RatingBatch } from '../../domain/rating-batch.domain';
import { RatingBatchEntity, BatchStatus } from '../persistence/rating-batch.entity';

@Injectable()
export class TypeOrmRatingBatchRepositoryAdapter implements RatingBatchRepository {
  constructor(
    @InjectRepository(RatingBatchEntity)
    private readonly repository: Repository<RatingBatchEntity>,
  ) {}

  async create(ratingBatch: RatingBatch): Promise<RatingBatch> {
    const entity = this.toEntity(ratingBatch);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<RatingBatch | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindRatingBatchesFilter): Promise<RatingBatch[]> {
    const queryBuilder = this.repository.createQueryBuilder('batch');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.andWhere('batch.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.status) {
        queryBuilder.andWhere('batch.status = :status', { status: filter.status });
      }

      if (filter.startDate) {
        queryBuilder.andWhere('batch.created_at >= :startDate', {
          startDate: filter.startDate,
        });
      }

      if (filter.endDate) {
        queryBuilder.andWhere('batch.created_at <= :endDate', {
          endDate: filter.endDate,
        });
      }
    }

    queryBuilder.orderBy('batch.created_at', 'DESC');
    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByOrganization(organizationId: string): Promise<RatingBatch[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findPending(organizationId: string): Promise<RatingBatch[]> {
    return this.findAll({ organizationId, status: BatchStatus.PENDING });
  }

  async findProcessing(): Promise<RatingBatch[]> {
    const entities = await this.repository.find({
      where: { status: BatchStatus.PROCESSING },
      order: { startedAt: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(ratingBatch: RatingBatch): Promise<RatingBatch> {
    const entity = this.toEntity(ratingBatch);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindRatingBatchesFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('batch');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.andWhere('batch.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.status) {
        queryBuilder.andWhere('batch.status = :status', { status: filter.status });
      }
    }

    return queryBuilder.getCount();
  }

  private toEntity(domain: RatingBatch): RatingBatchEntity {
    const entity = new RatingBatchEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.status = domain.status;
    entity.startedAt = domain.startedAt || null;
    entity.completedAt = domain.completedAt || null;
    entity.totalRecords = domain.totalRecords;
    entity.processedRecords = domain.processedRecords;
    entity.successfulRecords = domain.successfulRecords;
    entity.failedRecords = domain.failedRecords;
    entity.totalAmount = domain.totalAmount;
    entity.currency = domain.currency;
    entity.errorMessage = domain.errorMessage || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: RatingBatchEntity): RatingBatch {
    return new RatingBatch(
      entity.id,
      entity.organizationId,
      entity.status,
      entity.startedAt ?? undefined,
      entity.completedAt ?? undefined,
      entity.totalRecords,
      entity.processedRecords,
      entity.successfulRecords,
      entity.failedRecords,
      entity.totalAmount,
      entity.currency,
      entity.errorMessage ?? undefined,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
