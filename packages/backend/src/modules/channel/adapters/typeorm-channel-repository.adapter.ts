/**
 * TypeORM Channel Repository Adapter
 * 
 * Implements the ChannelRepositoryPort using TypeORM.
 * Handles entity↔domain conversions and persists to database.
 * 
 * This is the ADAPTER layer in Hexagonal Architecture.
 * Adapters can have framework dependencies (TypeORM, NestJS, etc.)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelEntity } from '../../../entities/channel.entity';
import { Channel, ChannelState, ChannelDirection } from '../domain/channel.domain';
import { ChannelRepositoryPort, ListChannelsResult } from '../ports/channel-repository.port';

/**
 * Map entity ChannelDirection to domain ChannelDirection
 */
function mapEntityDirectionToDomain(entityDir: string): ChannelDirection {
  return entityDir.toLowerCase() === 'inbound' 
    ? ChannelDirection.INBOUND 
    : ChannelDirection.OUTBOUND;
}

/**
 * Convert TypeORM entity to domain model
 */
function entityToDomain(entity: ChannelEntity): Channel {
  return Channel.fromPersistence({
    id: entity.id,
    organizationId: entity.organizationId || null,
    callId: entity.callId || null,
    bridgeId: entity.bridgeId || null,
    state: entity.state as ChannelState,
    direction: mapEntityDirectionToDomain(entity.direction),
    callerName: entity.callerName,
    callerNumber: entity.callerNumber,
    connectedName: entity.connectedName || null,
    connectedNumber: entity.connectedNumber || null,
    dialedNumber: entity.dialedNumber || null,
    language: entity.language || null,
    accountCode: entity.accountCode || null,
    channelvars: (entity.channelvars as Record<string, string> | undefined) || null,
    providerMetadata: entity.providerMetadata || null,
    createdAt: entity.createdAt,
    answeredAt: entity.answeredAt || null,
    endedAt: entity.endedAt || null,
  });
}

/**
 * Convert domain model to TypeORM entity
 */
function domainToEntity(domain: Channel): ChannelEntity {
  const data = domain.toPersistence();
  const entity = new ChannelEntity();
  entity.id = data.id;
  entity.organizationId = data.organizationId!;
  entity.callId = data.callId!;
  entity.bridgeId = data.bridgeId!;
  entity.state = data.state;
  entity.direction = data.direction as any;
  entity.callerName = data.callerName;
  entity.callerNumber = data.callerNumber;
  entity.connectedName = data.connectedName!;
  entity.connectedNumber = data.connectedNumber!;
  entity.dialedNumber = data.dialedNumber!;
  entity.language = data.language!;
  entity.accountCode = data.accountCode!;
  entity.channelvars = data.channelvars as any;
  entity.providerMetadata = data.providerMetadata!;
  entity.createdAt = data.createdAt;
  entity.answeredAt = data.answeredAt!;
  entity.endedAt = data.endedAt!;
  return entity;
}

@Injectable()
export class TypeOrmChannelRepositoryAdapter implements ChannelRepositoryPort {
  constructor(
    @InjectRepository(ChannelEntity)
    private readonly repository: Repository<ChannelEntity>,
  ) {}

  async save(channel: Channel): Promise<Channel> {
    const entity = domainToEntity(channel);
    const saved = await this.repository.save(entity);
    return entityToDomain(saved);
  }

  async findById(id: string): Promise<Channel | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['organization', 'call'],
    });

    if (!entity) {
      return null;
    }

    return entityToDomain(entity);
  }

  async findActive(options?: { organizationId?: string }): Promise<Channel[]> {
    const query = this.repository
      .createQueryBuilder('channel')
      .where('channel.endedAt IS NULL')
      .orderBy('channel.createdAt', 'DESC');

    if (options?.organizationId) {
      query.andWhere('channel.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    const entities = await query.getMany();
    return entities.map(entityToDomain);
  }

  async findByOrganization(organizationId: string): Promise<Channel[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      relations: ['organization', 'call'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(entityToDomain);
  }

  async findByCallId(callId: string): Promise<Channel[]> {
    const entities = await this.repository.find({
      where: { callId },
      relations: ['call'],
      order: { createdAt: 'ASC' },
    });
    return entities.map(entityToDomain);
  }

  async findByBridgeId(bridgeId: string): Promise<Channel[]> {
    const entities = await this.repository.find({
      where: { bridgeId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(entityToDomain);
  }

  async list(options?: {
    organizationId?: string;
    callId?: string;
    bridgeId?: string;
    state?: ChannelState;
    includeEnded?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ListChannelsResult> {
    let query = this.repository.createQueryBuilder('channel');

    if (options?.organizationId) {
      query = query.andWhere('channel.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.callId) {
      query = query.andWhere('channel.callId = :callId', {
        callId: options.callId,
      });
    }

    if (options?.bridgeId) {
      query = query.andWhere('channel.bridgeId = :bridgeId', {
        bridgeId: options.bridgeId,
      });
    }

    if (options?.state) {
      query = query.andWhere('channel.state = :state', {
        state: options.state,
      });
    }

    if (!options?.includeEnded) {
      query = query.andWhere('channel.endedAt IS NULL');
    }

    const total = await query.getCount();

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    query = query.orderBy('channel.createdAt', 'DESC');

    const entities = await query.getMany();
    const channels = entities.map(entityToDomain);

    return { channels, total };
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }
}
