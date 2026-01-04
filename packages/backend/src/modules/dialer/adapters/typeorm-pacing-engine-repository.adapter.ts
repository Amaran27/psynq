/**
 * TypeORM PacingEngine Repository Adapter (Hexagonal Architecture)
 * 
 * Adapts TypeORM repository to PacingEngineRepositoryPort interface
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PacingEngineEntity } from '../../../entities/dialer/pacing-engine.entity';
import {
  PacingEngineRepositoryPort,
  PacingEngineQueryOptions,
} from '../ports/pacing-engine-repository.port';
import { PacingEngine } from '../domain/pacing-engine.domain';

@Injectable()
export class TypeOrmPacingEngineRepositoryAdapter implements PacingEngineRepositoryPort {
  constructor(
    @InjectRepository(PacingEngineEntity)
    private readonly repository: Repository<PacingEngineEntity>,
  ) {}

  async create(pacingEngine: PacingEngine): Promise<PacingEngine> {
    const entity = this.repository.create(pacingEngine.toObject());
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<PacingEngine | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: PacingEngineQueryOptions): Promise<PacingEngine[]> {
    const query = this.repository.createQueryBuilder('pacing_engine');

    if (options?.campaignId) {
      query.andWhere('pacing_engine.campaignId = :campaignId', {
        campaignId: options.campaignId,
      });
    }

    if (options?.sessionId) {
      query.andWhere('pacing_engine.sessionId = :sessionId', {
        sessionId: options.sessionId,
      });
    }

    if (options?.organizationId) {
      query.andWhere('pacing_engine.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.status) {
      query.andWhere('pacing_engine.status = :status', {
        status: options.status,
      });
    }

    if (options?.limit) {
      query.take(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    query.orderBy('pacing_engine.createdAt', 'DESC');

    const entities = await query.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByCampaignId(campaignId: string): Promise<PacingEngine | null> {
    const entity = await this.repository.findOne({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findBySessionId(sessionId: string): Promise<PacingEngine | null> {
    const entity = await this.repository.findOne({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async update(id: string, updates: Partial<PacingEngine>): Promise<PacingEngine> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`PacingEngine with id ${id} not found`);
    }

    const updateData = updates instanceof PacingEngine ? updates.toObject() : updates;
    Object.assign(entity, updateData);

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(options?: PacingEngineQueryOptions): Promise<number> {
    const query = this.repository.createQueryBuilder('pacing_engine');

    if (options?.campaignId) {
      query.andWhere('pacing_engine.campaignId = :campaignId', {
        campaignId: options.campaignId,
      });
    }

    if (options?.sessionId) {
      query.andWhere('pacing_engine.sessionId = :sessionId', {
        sessionId: options.sessionId,
      });
    }

    if (options?.organizationId) {
      query.andWhere('pacing_engine.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.status) {
      query.andWhere('pacing_engine.status = :status', {
        status: options.status,
      });
    }

    return await query.getCount();
  }

  /**
   * Convert TypeORM entity to domain model
   */
  private toDomain(entity: PacingEngineEntity): PacingEngine {
    return new PacingEngine({
      id: entity.id,
      campaignId: entity.campaignId,
      sessionId: entity.sessionId,
      organizationId: entity.organizationId,
      algorithm: entity.algorithm,
      status: entity.status,
      targetAbandonmentRate: Number(entity.targetAbandonmentRate),
      maxConcurrentCalls: entity.maxConcurrentCalls,
      linesPerAgent: entity.linesPerAgent,
      dialTimeoutSeconds: entity.dialTimeoutSeconds,
      minAgentsRequired: entity.minAgentsRequired,
      availableAgents: entity.availableAgents,
      busyAgents: entity.busyAgents,
      activeCalls: entity.activeCalls,
      queuedCalls: entity.queuedCalls,
      avgAnswerTimeSeconds: Number(entity.avgAnswerTimeSeconds),
      avgCallDurationSeconds: Number(entity.avgCallDurationSeconds),
      contactRate: Number(entity.contactRate),
      actualAbandonmentRate: Number(entity.actualAbandonmentRate),
      pacingCalculation: entity.pacingCalculation as any,
      totalCallsDialed: entity.totalCallsDialed,
      totalCallsAnswered: entity.totalCallsAnswered,
      totalCallsAbandoned: entity.totalCallsAbandoned,
      totalCallsConnected: entity.totalCallsConnected,
      customParameters: entity.customParameters,
      startedAt: entity.startedAt,
      stoppedAt: entity.stoppedAt,
      lastCalculationAt: entity.lastCalculationAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
