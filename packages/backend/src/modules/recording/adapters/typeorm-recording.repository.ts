/**
 * TypeORM Recording Repository (Adapter)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { RecordingRepositoryPort, RecordingSearchFilters } from '../ports/recording-repository.port';
import { Recording } from '../domain/recording.entity';
import { RecordingEntity } from '../entities/recording.entity';

@Injectable()
export class TypeOrmRecordingRepository implements RecordingRepositoryPort {
  constructor(
    @InjectRepository(RecordingEntity)
    private readonly repository: Repository<RecordingEntity>,
  ) {}

  async create(recording: Recording): Promise<Recording> {
    const entity = RecordingEntity.fromDomain(recording);
    const saved = await this.repository.save(entity);
    return saved.toDomain();
  }

  async findById(id: string): Promise<Recording | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async findByCallId(callId: string): Promise<Recording | null> {
    const entity = await this.repository.findOne({ where: { callId } });
    return entity ? entity.toDomain() : null;
  }

  async find(
    filters: RecordingSearchFilters,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Recording[]> {
    const queryBuilder = this.repository.createQueryBuilder('recording');

    if (filters.organizationId) {
      queryBuilder.andWhere('recording.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters.callId) {
      queryBuilder.andWhere('recording.callId = :callId', {
        callId: filters.callId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('recording.status = :status', {
        status: filters.status,
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('recording.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.andWhere('recording.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      queryBuilder.andWhere('recording.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    queryBuilder.orderBy('recording.createdAt', 'DESC');
    queryBuilder.skip(offset);
    queryBuilder.take(limit);

    const entities = await queryBuilder.getMany();
    return entities.map((e) => e.toDomain());
  }

  async count(filters: RecordingSearchFilters): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('recording');

    if (filters.organizationId) {
      queryBuilder.andWhere('recording.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters.callId) {
      queryBuilder.andWhere('recording.callId = :callId', {
        callId: filters.callId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('recording.status = :status', {
        status: filters.status,
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('recording.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.andWhere('recording.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      queryBuilder.andWhere('recording.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    return queryBuilder.getCount();
  }

  async update(recording: Recording): Promise<Recording> {
    const entity = RecordingEntity.fromDomain(recording);
    const saved = await this.repository.save(entity);
    return saved.toDomain();
  }

  async delete(id: string): Promise<void> {
    await this.repository.update(id, {
      status: 'deleted' as any,
      deletedAt: new Date(),
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
