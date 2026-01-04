import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmIntegration } from '../../domain/crm-integration.domain';
import {
  CRM_REPOSITORY_PORT,
  FindCrmIntegrationsFilter,
} from '../../domain/ports/crm-repository.port';
import { CrmIntegrationEntity, ConnectionStatus } from '../persistence/crm-integration.entity';

@Injectable()
export class TypeOrmCrmRepositoryAdapter implements CRM_REPOSITORY_PORT {
  constructor(
    @InjectRepository(CrmIntegrationEntity)
    private readonly repository: Repository<CrmIntegrationEntity>,
  ) {}

  async create(integration: CrmIntegration): Promise<CrmIntegration> {
    const entity = this.toEntity(integration);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<CrmIntegration | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindCrmIntegrationsFilter): Promise<CrmIntegration[]> {
    const queryBuilder = this.repository.createQueryBuilder('crm');

    if (filter?.organizationId) {
      queryBuilder.andWhere('crm.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }

    if (filter?.provider) {
      queryBuilder.andWhere('crm.provider = :provider', { provider: filter.provider });
    }

    if (filter?.status) {
      queryBuilder.andWhere('crm.status = :status', { status: filter.status });
    }

    if (filter?.isActive !== undefined) {
      queryBuilder.andWhere('crm.isActive = :isActive', { isActive: filter.isActive });
    }

    queryBuilder.orderBy('crm.createdAt', 'DESC');

    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByOrganization(organizationId: string): Promise<CrmIntegration[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByProvider(
    organizationId: string,
    provider: CrmIntegration['provider'],
  ): Promise<CrmIntegration[]> {
    const entities = await this.repository.find({
      where: { organizationId, provider },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findActive(organizationId: string): Promise<CrmIntegration[]> {
    const entities = await this.repository.find({
      where: {
        organizationId,
        isActive: true,
        status: ConnectionStatus.CONNECTED,
      },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findSyncDue(): Promise<CrmIntegration[]> {
    const now = new Date();
    const entities = await this.repository
      .createQueryBuilder('crm')
      .where('crm.isActive = :isActive', { isActive: true })
      .andWhere('crm.status = :status', { status: ConnectionStatus.CONNECTED })
      .andWhere('crm.nextSyncAt IS NOT NULL')
      .andWhere('crm.nextSyncAt <= :now', { now })
      .orderBy('crm.nextSyncAt', 'ASC')
      .getMany();

    return entities.map((entity) => this.toDomain(entity));
  }

  async update(integration: CrmIntegration): Promise<CrmIntegration> {
    const entity = this.toEntity(integration);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindCrmIntegrationsFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('crm');

    if (filter?.organizationId) {
      queryBuilder.andWhere('crm.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }

    if (filter?.provider) {
      queryBuilder.andWhere('crm.provider = :provider', { provider: filter.provider });
    }

    if (filter?.status) {
      queryBuilder.andWhere('crm.status = :status', { status: filter.status });
    }

    if (filter?.isActive !== undefined) {
      queryBuilder.andWhere('crm.isActive = :isActive', { isActive: filter.isActive });
    }

    return queryBuilder.getCount();
  }

  private toEntity(domain: CrmIntegration): CrmIntegrationEntity {
    const entity = new CrmIntegrationEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.provider = domain.provider;
    entity.name = domain.name;
    entity.description = (domain.description || undefined) as any;
    entity.status = domain.status;
    entity.clientId = (domain.clientId || undefined) as any;
    entity.clientSecret = (domain.clientSecret || undefined) as any;
    entity.accessToken = (domain.accessToken || undefined) as any;
    entity.refreshToken = (domain.refreshToken || undefined) as any;
    entity.instanceUrl = (domain.instanceUrl || undefined) as any;
    entity.tokenExpiresAt = (domain.tokenExpiresAt || undefined) as any;
    entity.syncConfig = domain.syncConfig as any;
    entity.lastSyncAt = (domain.lastSyncAt || undefined) as any;
    entity.nextSyncAt = (domain.nextSyncAt || undefined) as any;
    entity.totalSyncs = domain.totalSyncs;
    entity.successfulSyncs = domain.successfulSyncs;
    entity.failedSyncs = domain.failedSyncs;
    entity.recordsSynced = domain.recordsSynced;
    entity.lastErrorMessage = (domain.lastErrorMessage || undefined) as any;
    entity.lastErrorAt = (domain.lastErrorAt || undefined) as any;
    entity.metadata = domain.metadata as any;
    entity.isActive = domain.isActive;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: CrmIntegrationEntity): CrmIntegration {
    return new CrmIntegration(
      entity.id,
      entity.organizationId,
      entity.provider,
      entity.name,
      entity.status,
      entity.description ?? undefined,
      entity.clientId ?? undefined,
      entity.clientSecret ?? undefined,
      entity.accessToken ?? undefined,
      entity.refreshToken ?? undefined,
      entity.instanceUrl ?? undefined,
      entity.tokenExpiresAt ?? undefined,
      entity.syncConfig || {},
      entity.lastSyncAt ?? undefined,
      entity.nextSyncAt ?? undefined,
      entity.totalSyncs,
      entity.successfulSyncs,
      entity.failedSyncs,
      entity.recordsSynced,
      entity.lastErrorMessage ?? undefined,
      entity.lastErrorAt ?? undefined,
      entity.metadata || {},
      entity.isActive,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
