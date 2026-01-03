/**
 * TypeORM Lead Repository Adapter
 * 
 * Hexagonal Architecture - Adapter implements port using TypeORM
 * Framework-specific code lives HERE only
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity, LeadStatus as EntityLeadStatus, LeadCallOutcome as EntityLeadCallOutcome } from '../../../entities/dialer/lead.entity';
import { Lead, LeadStatus, LeadCallOutcome } from '../domain/lead.domain';
import { LeadRepositoryPort } from '../ports/lead-repository.port';

@Injectable()
export class TypeOrmLeadRepositoryAdapter implements LeadRepositoryPort {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly repository: Repository<LeadEntity>,
  ) {}

  async save(lead: Lead): Promise<Lead> {
    let entity = await this.repository.findOne({ where: { id: lead.id } });

    if (!entity) {
      // Create new
      entity = new LeadEntity();
      entity.id = lead.id;
    }

    // Update fields
    entity.campaignId = lead.campaignId;
    entity.phoneNumber = lead.phoneNumber;
    entity.firstName = (lead.firstName ?? null) as any;
    entity.lastName = (lead.lastName ?? null) as any;
    entity.email = (lead.email ?? null) as any;
    entity.status = lead.status as any;
    entity.priority = lead.priority;
    entity.timezone = (lead.timezone ?? null) as any;
    entity.customData = lead.customData;
    entity.attempts = lead.attempts as any;
    entity.assignedAgentId = (lead.assignedAgentId ?? null) as any;
    entity.lastAttemptAt = (lead.lastAttemptAt ?? null) as any;
    entity.nextAttemptAt = (lead.nextAttemptAt ?? null) as any;
    entity.contactedAt = (lead.contactedAt ?? null) as any;
    entity.convertedAt = (lead.convertedAt ?? null) as any;

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async saveMany(leads: Lead[]): Promise<Lead[]> {
    const entities = leads.map(lead => {
      const entity = new LeadEntity();
      entity.id = lead.id;
      entity.campaignId = lead.campaignId;
      entity.phoneNumber = lead.phoneNumber;
      entity.firstName = (lead.firstName ?? null) as any;
      entity.lastName = (lead.lastName ?? null) as any;
      entity.email = (lead.email ?? null) as any;
      entity.status = lead.status as any;
      entity.priority = lead.priority;
      entity.timezone = (lead.timezone ?? null) as any;
      entity.customData = lead.customData;
      entity.attempts = lead.attempts as any;
      entity.assignedAgentId = (lead.assignedAgentId ?? null) as any;
      entity.lastAttemptAt = (lead.lastAttemptAt ?? null) as any;
      entity.nextAttemptAt = (lead.nextAttemptAt ?? null) as any;
      entity.contactedAt = (lead.contactedAt ?? null) as any;
      entity.convertedAt = (lead.convertedAt ?? null) as any;
      return entity;
    });

    const saved = await this.repository.save(entities);
    return saved.map(e => this.toDomain(e));
  }

  async findById(id: string): Promise<Lead | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByPhoneAndCampaign(phoneNumber: string, campaignId: string): Promise<Lead | null> {
    const entity = await this.repository.findOne({
      where: { phoneNumber, campaignId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filters?: {
    campaignId?: string;
    status?: LeadStatus;
    assignedAgentId?: string;
  }): Promise<Lead[]> {
    const where: any = {};
    if (filters?.campaignId) where.campaignId = filters.campaignId;
    if (filters?.status) where.status = filters.status;
    if (filters?.assignedAgentId) where.assignedAgentId = filters.assignedAgentId;

    const entities = await this.repository.find({ where });
    return entities.map(e => this.toDomain(e));
  }

  async findDialableLeads(
    campaignId: string,
    maxAttempts: number,
    limit: number,
  ): Promise<Lead[]> {
    const entities = await this.repository
      .createQueryBuilder('lead')
      .where('lead.campaignId = :campaignId', { campaignId })
      .andWhere('lead.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [LeadStatus.DNC, LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED],
      })
      .andWhere('jsonb_array_length(lead.attempts) < :maxAttempts', { maxAttempts })
      .andWhere(
        '(lead.nextAttemptAt IS NULL OR lead.nextAttemptAt <= :now)',
        { now: new Date() },
      )
      .orderBy('lead.priority', 'DESC')
      .addOrderBy('lead.lastAttemptAt', 'ASC', 'NULLS FIRST')
      .limit(limit)
      .getMany();

    return entities.map(e => this.toDomain(e));
  }

  async findNextLeadForAgent(
    campaignId: string,
    agentId: string,
    maxAttempts: number,
  ): Promise<Lead | null> {
    const entity = await this.repository
      .createQueryBuilder('lead')
      .where('lead.campaignId = :campaignId', { campaignId })
      .andWhere('lead.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [LeadStatus.DNC, LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED],
      })
      .andWhere('jsonb_array_length(lead.attempts) < :maxAttempts', { maxAttempts })
      .andWhere(
        '(lead.nextAttemptAt IS NULL OR lead.nextAttemptAt <= :now)',
        { now: new Date() },
      )
      .andWhere(
        '(lead.assignedAgentId IS NULL OR lead.assignedAgentId = :agentId)',
        { agentId },
      )
      .orderBy('lead.priority', 'DESC')
      .addOrderBy('lead.lastAttemptAt', 'ASC', 'NULLS FIRST')
      .getOne();

    return entity ? this.toDomain(entity) : null;
  }

  async countByStatus(campaignId: string, status: LeadStatus): Promise<number> {
    return this.repository.count({
      where: { campaignId, status: status as any },
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByCampaign(campaignId: string): Promise<void> {
    await this.repository.delete({ campaignId });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  /**
   * Convert TypeORM entity to domain model
   */
  private toDomain(entity: LeadEntity): Lead {
    return new Lead(
      entity.id,
      entity.campaignId,
      entity.phoneNumber,
      entity.firstName ?? undefined,
      entity.lastName ?? undefined,
      entity.email ?? undefined,
      entity.status as LeadStatus,
      entity.priority,
      entity.timezone ?? undefined,
      entity.customData ?? {},
      (entity.attempts ?? []) as any,
      entity.assignedAgentId ?? undefined,
      entity.lastAttemptAt ?? undefined,
      entity.nextAttemptAt ?? undefined,
      entity.createdAt,
      entity.updatedAt,
      entity.contactedAt ?? undefined,
      entity.convertedAt ?? undefined,
    );
  }
}
