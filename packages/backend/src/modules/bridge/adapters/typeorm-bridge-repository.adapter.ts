/**
 * TypeORM Bridge Repository Adapter
 * 
 * Implements the BridgeRepositoryPort using TypeORM.
 * Handles entity↔domain conversions and persists to database.
 * 
 * This is the ADAPTER layer in Hexagonal Architecture.
 * Adapters can have framework dependencies (TypeORM, NestJS, etc.)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BridgeEntity } from '../../../entities/bridge.entity';
import { Bridge, BridgeType, BridgeTechnology } from '../domain/bridge.domain';
import { BridgeRepositoryPort, ListBridgesResult } from '../ports/bridge-repository.port';

/**
 * Map entity BridgeType to domain BridgeType
 * Note: Entity has DTMF_EVENTS, domain doesn't (out of scope for now)
 */
function mapEntityTypeToDomainType(entityType: string): BridgeType {
  const normalized = entityType.toLowerCase();
  switch (normalized) {
    case 'mixing':
      return BridgeType.MIXING;
    case 'holding':
      return BridgeType.HOLDING;
    case 'proxy':
      return BridgeType.PROXY;
    default:
      return BridgeType.MIXING; // Default fallback
  }
}

function mapDomainTypeToEntityType(domainType: BridgeType): string {
  return domainType; // Enums match for now
}

/**
 * Map entity BridgeTechnology to domain BridgeTechnology
 */
function mapEntityTechnologyToDomain(entityTech: string): BridgeTechnology {
  const normalized = entityTech.toLowerCase();
  if (normalized.includes('softmix')) return BridgeTechnology.SOFTMIX;
  if (normalized.includes('native')) return BridgeTechnology.NATIVE;
  return BridgeTechnology.SOFTMIX; // Default
}

function mapDomainTechnologyToEntity(domainTech: BridgeTechnology): string {
  return domainTech; // Enums match for now
}

/**
 * Convert TypeORM entity to domain model
 */
function entityToDomain(entity: BridgeEntity): Bridge {
  return Bridge.fromPersistence({
    id: entity.id,
    name: entity.name || '',
    bridgeType: mapEntityTypeToDomainType(entity.bridgeType),
    technology: mapEntityTechnologyToDomain(entity.technology),
    organizationId: entity.organizationId,
    channelIds: entity.channelIds || [],
    isRecording: entity.isRecording,
    recordingName: entity.recordingName,
    createdAt: entity.createdAt,
    destroyedAt: entity.destroyedAt,
  });
}

/**
 * Convert domain model to TypeORM entity
 */
function domainToEntity(domain: Bridge): BridgeEntity {
  const data = domain.toPersistence();
  const entity = new BridgeEntity();
  entity.id = data.id;
  entity.name = data.name;
  entity.bridgeType = mapDomainTypeToEntityType(data.bridgeType) as any;
  entity.technology = mapDomainTechnologyToEntity(data.technology) as any;
  entity.organizationId = data.organizationId!;
  entity.channelIds = data.channelIds;
  entity.isRecording = data.isRecording;
  entity.recordingName = data.recordingName!;
  entity.createdAt = data.createdAt;
  entity.destroyedAt = data.destroyedAt!;
  return entity;
}

@Injectable()
export class TypeOrmBridgeRepositoryAdapter implements BridgeRepositoryPort {
  constructor(
    @InjectRepository(BridgeEntity)
    private readonly repository: Repository<BridgeEntity>,
  ) {}

  async save(bridge: Bridge): Promise<Bridge> {
    const entity = domainToEntity(bridge);
    const saved = await this.repository.save(entity);
    return entityToDomain(saved);
  }

  async findById(id: string): Promise<Bridge | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!entity) {
      return null;
    }

    return entityToDomain(entity);
  }

  async findActive(options?: { organizationId?: string }): Promise<Bridge[]> {
    const query = this.repository
      .createQueryBuilder('bridge')
      .where('bridge.destroyedAt IS NULL')
      .orderBy('bridge.createdAt', 'DESC');

    if (options?.organizationId) {
      query.andWhere('bridge.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    const entities = await query.getMany();
    return entities.map(entityToDomain);
  }

  async findByOrganization(organizationId: string): Promise<Bridge[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(entityToDomain);
  }

  async list(options?: {
    organizationId?: string;
    includeDestroyed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ListBridgesResult> {
    let query = this.repository.createQueryBuilder('bridge');

    if (options?.organizationId) {
      query = query.andWhere('bridge.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (!options?.includeDestroyed) {
      query = query.andWhere('bridge.destroyedAt IS NULL');
    }

    const total = await query.getCount();

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    query = query.orderBy('bridge.createdAt', 'DESC');

    const entities = await query.getMany();
    const bridges = entities.map(entityToDomain);

    return { bridges, total };
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }
}
