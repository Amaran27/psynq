/**
 * TypeORM DialingSession Repository Adapter
 * 
 * Hexagonal Architecture - Adapter implements port using TypeORM
 * Framework-specific code lives HERE only
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DialingSessionEntity, DialingMode as EntityDialingMode, SessionStatus as EntitySessionStatus } from '../../../entities/dialer/dialing-session.entity';
import { DialingSession, DialingMode, SessionStatus } from '../domain/dialing-session.domain';
import { DialingSessionRepositoryPort } from '../ports/dialing-session-repository.port';

@Injectable()
export class TypeOrmDialingSessionRepositoryAdapter implements DialingSessionRepositoryPort {
  constructor(
    @InjectRepository(DialingSessionEntity)
    private readonly repository: Repository<DialingSessionEntity>,
  ) {}

  async save(session: DialingSession): Promise<DialingSession> {
    let entity = await this.repository.findOne({ where: { id: session.id } });

    if (!entity) {
      // Create new
      entity = new DialingSessionEntity();
      entity.id = session.id;
    }

    // Update fields
    entity.campaignId = session.campaignId;
    entity.mode = session.mode as any;
    entity.status = session.status as any;
    entity.organizationId = (session.organizationId ?? null) as any;
    entity.linesPerAgent = session.pacingConfig.linesPerAgent;
    entity.targetAbandonmentRate = session.pacingConfig.targetAbandonmentRate;
    entity.maxConcurrentCalls = session.pacingConfig.maxConcurrentCalls;
    entity.dialTimeoutSeconds = session.pacingConfig.dialTimeoutSeconds;
    entity.leadsProcessed = session.stats.leadsProcessed;
    entity.callsAttempted = session.stats.callsAttempted;
    entity.callsAnswered = session.stats.callsAnswered;
    entity.callsAbandoned = session.stats.callsAbandoned;
    entity.avgWaitTimeSeconds = session.stats.avgWaitTimeSeconds;
    entity.avgTalkTimeSeconds = session.stats.avgTalkTimeSeconds;
    entity.conversionRate = session.stats.conversionRate;
    entity.activeAgentIds = session.activeAgentIds;
    entity.startedAt = (session.startedAt ?? null) as any;
    entity.completedAt = (session.completedAt ?? null) as any;

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<DialingSession | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findActiveByCampaign(campaignId: string): Promise<DialingSession | null> {
    const entity = await this.repository.findOne({
      where: {
        campaignId,
        status: EntitySessionStatus.ACTIVE,
      },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filters?: {
    campaignId?: string;
    status?: SessionStatus;
    organizationId?: string;
  }): Promise<DialingSession[]> {
    const where: any = {};
    if (filters?.campaignId) where.campaignId = filters.campaignId;
    if (filters?.status) where.status = filters.status;
    if (filters?.organizationId) where.organizationId = filters.organizationId;

    const entities = await this.repository.find({ where });
    return entities.map(e => this.toDomain(e));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async hasActiveSession(campaignId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        campaignId,
        status: EntitySessionStatus.ACTIVE,
      },
    });
    return count > 0;
  }

  /**
   * Convert TypeORM entity to domain model
   */
  private toDomain(entity: DialingSessionEntity): DialingSession {
    return new DialingSession(
      entity.id,
      entity.campaignId,
      entity.mode as DialingMode,
      entity.status as SessionStatus,
      entity.organizationId ?? undefined,
      {
        linesPerAgent: entity.linesPerAgent,
        targetAbandonmentRate: parseFloat(entity.targetAbandonmentRate.toString()),
        maxConcurrentCalls: entity.maxConcurrentCalls,
        dialTimeoutSeconds: entity.dialTimeoutSeconds,
      },
      {
        leadsProcessed: entity.leadsProcessed,
        callsAttempted: entity.callsAttempted,
        callsAnswered: entity.callsAnswered,
        callsAbandoned: entity.callsAbandoned,
        avgWaitTimeSeconds: parseFloat(entity.avgWaitTimeSeconds.toString()),
        avgTalkTimeSeconds: parseFloat(entity.avgTalkTimeSeconds.toString()),
        conversionRate: parseFloat(entity.conversionRate.toString()),
      },
      entity.activeAgentIds ?? [],
      entity.createdAt,
      entity.updatedAt,
      entity.startedAt ?? undefined,
      entity.completedAt ?? undefined,
    );
  }
}
