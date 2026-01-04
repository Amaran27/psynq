/**
 * Scorecard Repository Adapter
 * 
 * TypeORM implementation of ScorecardRepository
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScorecardRepository } from '../../domain/ports/scorecard.repository';
import { Scorecard, ScorecardStatus } from '../../domain/scorecard.domain';
import { ScorecardEntity } from './scorecard.entity';

@Injectable()
export class ScorecardRepositoryAdapter implements ScorecardRepository {
  constructor(
    @InjectRepository(ScorecardEntity)
    private readonly repository: Repository<ScorecardEntity>,
  ) {}

  async create(scorecard: Scorecard): Promise<Scorecard> {
    const entity = this.toEntity(scorecard);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string, organizationId: string): Promise<Scorecard | null> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganization(organizationId: string, filters?: { status?: string }): Promise<Scorecard[]> {
    const query = this.repository
      .createQueryBuilder('scorecard')
      .where('scorecard.organizationId = :organizationId', { organizationId });

    if (filters?.status) {
      query.andWhere('scorecard.status = :status', { status: filters.status });
    }

    const entities = await query.orderBy('scorecard.createdAt', 'DESC').getMany();
    return entities.map(e => this.toDomain(e));
  }

  async update(scorecard: Scorecard): Promise<Scorecard> {
    const entity = this.toEntity(scorecard);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

  async getStatistics(organizationId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    archived: number;
  }> {
    const [total, active, draft, archived] = await Promise.all([
      this.repository.count({ where: { organizationId } }),
      this.repository.count({ where: { organizationId, status: ScorecardStatus.ACTIVE } }),
      this.repository.count({ where: { organizationId, status: ScorecardStatus.DRAFT } }),
      this.repository.count({ where: { organizationId, status: ScorecardStatus.ARCHIVED } }),
    ]);

    return { total, active, draft, archived };
  }

  private toEntity(domain: Scorecard): ScorecardEntity {
    const entity = new ScorecardEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.name = domain.name;
    entity.description = domain.description;
    entity.status = domain.status;
    entity.criteria = domain.criteria;
    entity.passingScore = domain.passingScore;
    entity.useWeightedScoring = domain.useWeightedScoring;
    entity.metadata = domain.metadata;
    if (domain.createdAt) entity.createdAt = domain.createdAt;
    if (domain.updatedAt) entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: ScorecardEntity): Scorecard {
    return new Scorecard(
      entity.id,
      entity.organizationId,
      entity.name,
      entity.description,
      entity.status as ScorecardStatus,
      entity.criteria,
      entity.passingScore,
      entity.useWeightedScoring,
      entity.metadata,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
