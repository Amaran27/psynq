import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesforceConnection } from '../../domain/salesforce-connection.domain';
import { SALESFORCE_CONNECTION_REPOSITORY_PORT } from '../../domain/ports/salesforce-connection-repository.port';
import { SalesforceConnectionEntity } from '../persistence/salesforce-connection.entity';

@Injectable()
export class TypeOrmSalesforceConnectionRepositoryAdapter
  implements SALESFORCE_CONNECTION_REPOSITORY_PORT
{
  constructor(
    @InjectRepository(SalesforceConnectionEntity)
    private readonly repository: Repository<SalesforceConnectionEntity>,
  ) {}

  async create(connection: SalesforceConnection): Promise<SalesforceConnection> {
    const entity = this.toEntity(connection);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<SalesforceConnection | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCrmIntegrationId(crmIntegrationId: string): Promise<SalesforceConnection | null> {
    const entity = await this.repository.findOne({ where: { crmIntegrationId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrgId(orgId: string): Promise<SalesforceConnection | null> {
    const entity = await this.repository.findOne({ where: { orgId } });
    return entity ? this.toDomain(entity) : null;
  }

  async update(connection: SalesforceConnection): Promise<SalesforceConnection> {
    const entity = this.toEntity(connection);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toEntity(domain: SalesforceConnection): SalesforceConnectionEntity {
    const entity = new SalesforceConnectionEntity();
    entity.id = domain.id;
    entity.crmIntegrationId = domain.crmIntegrationId;
    entity.orgId = domain.orgId;
    entity.orgName = (domain.orgName || undefined) as any;
    entity.edition = (domain.edition || undefined) as any;
    entity.apiVersion = domain.apiVersion;
    entity.userId = domain.userId;
    entity.userName = (domain.userName || undefined) as any;
    entity.userEmail = (domain.userEmail || undefined) as any;
    entity.apiLimits = domain.apiLimits as any;
    entity.limitsUpdatedAt = (domain.limitsUpdatedAt || undefined) as any;
    entity.availableObjects = domain.availableObjects;
    entity.syncedObjects = domain.syncedObjects;
    entity.fieldMappings = domain.fieldMappings as any;
    entity.webhookConfig = domain.webhookConfig as any;
    entity.lastHealthCheck = (domain.lastHealthCheck || undefined) as any;
    entity.isHealthy = domain.isHealthy;
    entity.consecutiveFailures = domain.consecutiveFailures;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: SalesforceConnectionEntity): SalesforceConnection {
    return new SalesforceConnection(
      entity.id,
      entity.crmIntegrationId,
      entity.orgId,
      entity.userId,
      entity.apiVersion,
      entity.orgName ?? undefined,
      entity.edition ?? undefined,
      entity.userName ?? undefined,
      entity.userEmail ?? undefined,
      entity.apiLimits || {},
      entity.limitsUpdatedAt ?? undefined,
      entity.availableObjects || [],
      entity.syncedObjects || [],
      entity.fieldMappings || {},
      entity.webhookConfig || {},
      entity.lastHealthCheck ?? undefined,
      entity.isHealthy,
      entity.consecutiveFailures,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
