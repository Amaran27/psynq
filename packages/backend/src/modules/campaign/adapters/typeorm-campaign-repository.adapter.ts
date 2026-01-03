/**
 * TypeORM Campaign Repository Adapter
 * 
 * Hexagonal Architecture - Adapter implements port using TypeORM
 * Framework-specific code lives HERE only
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignEntity } from '../../../entities/campaign.entity';
import { Campaign, CampaignStatus, CampaignType, DialMode } from '../domain/campaign.domain';
import { CampaignRepositoryPort } from '../ports/campaign-repository.port';

@Injectable()
export class TypeOrmCampaignRepositoryAdapter implements CampaignRepositoryPort {
  constructor(
    @InjectRepository(CampaignEntity)
    private readonly repository: Repository<CampaignEntity>,
  ) {}

  async save(campaign: Campaign): Promise<Campaign> {
    let entity = await this.repository.findOne({ where: { id: campaign.id } });

    if (!entity) {
      // Create new
      entity = new CampaignEntity();
      entity.id = campaign.id;
      entity.name = campaign.name;
      entity.description = (campaign.description ?? null) as any;
      entity.type = campaign.type as any;
      entity.status = campaign.status as any;
      entity.dialMode = campaign.dialMode as any;
      entity.organizationId = (campaign.organizationId ?? null) as any;
      entity.startTime = (campaign.startTime ?? null) as any;
      entity.endTime = (campaign.endTime ?? null) as any;
      entity.schedule = campaign.schedule as any;
      entity.maxAttempts = campaign.maxAttempts;
      entity.retryIntervalMinutes = campaign.retryIntervalMinutes;
      entity.abandonmentRate = (campaign.abandonmentRate ?? null) as any;
      entity.linesPerAgent = (campaign.linesPerAgent ?? null) as any;
      entity.leadListId = (campaign.leadListId ?? null) as any;
      entity.totalLeads = campaign.stats.totalLeads;
      entity.contactedLeads = campaign.stats.contactedLeads;
      entity.successfulCalls = campaign.stats.successfulCalls;
      entity.failedAttempts = campaign.stats.failedAttempts;
      entity.avgCallDurationSeconds = campaign.stats.avgCallDurationSeconds;
      entity.startedAt = (campaign.startedAt ?? null) as any;
      entity.completedAt = (campaign.completedAt ?? null) as any;
    } else {
      // Update existing
      entity.name = campaign.name;
      if (campaign.description !== undefined) entity.description = campaign.description;
      entity.type = campaign.type as any;
      entity.status = campaign.status as any;
      entity.dialMode = campaign.dialMode as any;
      if (campaign.organizationId !== undefined) entity.organizationId = campaign.organizationId;
      if (campaign.startTime !== undefined) entity.startTime = campaign.startTime;
      if (campaign.endTime !== undefined) entity.endTime = campaign.endTime;
      if (campaign.schedule !== undefined) entity.schedule = campaign.schedule as any;
      entity.maxAttempts = campaign.maxAttempts;
      entity.retryIntervalMinutes = campaign.retryIntervalMinutes;
      if (campaign.abandonmentRate !== undefined) entity.abandonmentRate = campaign.abandonmentRate;
      if (campaign.linesPerAgent !== undefined) entity.linesPerAgent = campaign.linesPerAgent;
      if (campaign.leadListId !== undefined) entity.leadListId = campaign.leadListId;
      entity.totalLeads = campaign.stats.totalLeads;
      entity.contactedLeads = campaign.stats.contactedLeads;
      entity.successfulCalls = campaign.stats.successfulCalls;
      entity.failedAttempts = campaign.stats.failedAttempts;
      entity.avgCallDurationSeconds = campaign.stats.avgCallDurationSeconds;
      if (campaign.startedAt !== undefined) entity.startedAt = campaign.startedAt;
      if (campaign.completedAt !== undefined) entity.completedAt = campaign.completedAt;
    }

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Campaign | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['organization'],
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filters?: {
    organizationId?: string;
    status?: CampaignStatus;
  }): Promise<Campaign[]> {
    const query = this.repository.createQueryBuilder('campaign');

    if (filters?.organizationId) {
      query.andWhere('campaign.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }

    query.orderBy('campaign.createdAt', 'DESC');

    const entities = await query.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  /**
   * Convert TypeORM entity to Domain entity
   */
  private toDomain(entity: CampaignEntity): Campaign {
    return new Campaign(
      entity.id,
      entity.name,
      entity.description,
      entity.type as CampaignType,
      entity.status as CampaignStatus,
      entity.dialMode as DialMode,
      entity.organizationId,
      entity.startTime,
      entity.endTime,
      entity.schedule as any,
      entity.maxAttempts,
      entity.retryIntervalMinutes,
      entity.abandonmentRate,
      entity.linesPerAgent,
      entity.leadListId,
      {
        totalLeads: entity.totalLeads,
        contactedLeads: entity.contactedLeads,
        successfulCalls: entity.successfulCalls,
        failedAttempts: entity.failedAttempts,
        avgCallDurationSeconds: entity.avgCallDurationSeconds,
      },
      entity.createdAt,
      entity.updatedAt,
      entity.startedAt,
      entity.completedAt,
    );
  }
}
