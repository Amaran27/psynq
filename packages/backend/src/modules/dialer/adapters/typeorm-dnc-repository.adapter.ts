/**
 * TypeORM DNC Repository Adapter
 * 
 * Hexagonal Architecture - Adapter implements port using TypeORM
 * Framework-specific code lives HERE only
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DNCEntryEntity, DNCSource as EntityDNCSource, DNCStatus as EntityDNCStatus } from '../../../entities/dialer/dnc-entry.entity';
import { DNCEntry, DNCSource, DNCStatus } from '../domain/dnc.domain';
import { DNCRepositoryPort } from '../ports/dnc-repository.port';

@Injectable()
export class TypeOrmDNCRepositoryAdapter implements DNCRepositoryPort {
  constructor(
    @InjectRepository(DNCEntryEntity)
    private readonly repository: Repository<DNCEntryEntity>,
  ) {}

  async save(entry: DNCEntry): Promise<DNCEntry> {
    let entity = await this.repository.findOne({ where: { id: entry.id } });

    if (!entity) {
      // Create new
      entity = new DNCEntryEntity();
      entity.id = entry.id;
    }

    // Update fields
    entity.phoneNumber = entry.phoneNumber;
    entity.source = entry.source as any;
    entity.status = entry.status as any;
    entity.organizationId = (entry.organizationId ?? null) as any;
    entity.reason = (entry.metadata.reason ?? null) as any;
    entity.addedBy = (entry.metadata.addedBy ?? null) as any;
    entity.requestDate = (entry.metadata.requestDate ?? null) as any;
    entity.expirationDate = (entry.metadata.expirationDate ?? null) as any;
    entity.expiresAt = (entry.expiresAt ?? null) as any;

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async saveMany(entries: DNCEntry[]): Promise<DNCEntry[]> {
    const entities = entries.map(entry => {
      const entity = new DNCEntryEntity();
      entity.id = entry.id;
      entity.phoneNumber = entry.phoneNumber;
      entity.source = entry.source as any;
      entity.status = entry.status as any;
      entity.organizationId = (entry.organizationId ?? null) as any;
      entity.reason = (entry.metadata.reason ?? null) as any;
      entity.addedBy = (entry.metadata.addedBy ?? null) as any;
      entity.requestDate = (entry.metadata.requestDate ?? null) as any;
      entity.expirationDate = (entry.metadata.expirationDate ?? null) as any;
      entity.expiresAt = (entry.expiresAt ?? null) as any;
      return entity;
    });

    const saved = await this.repository.save(entities);
    return saved.map(e => this.toDomain(e));
  }

  async findById(id: string): Promise<DNCEntry | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByPhoneNumber(phoneNumber: string, organizationId?: string): Promise<DNCEntry | null> {
    const where: any = { phoneNumber, status: EntityDNCStatus.ACTIVE };
    if (organizationId) where.organizationId = organizationId;

    const entity = await this.repository.findOne({ where });
    return entity ? this.toDomain(entity) : null;
  }

  async isOnDNCList(phoneNumber: string, organizationId?: string): Promise<boolean> {
    const where: any = { phoneNumber, status: EntityDNCStatus.ACTIVE };
    if (organizationId) where.organizationId = organizationId;

    const count = await this.repository.count({ where });
    return count > 0;
  }

  async findAll(filters?: {
    organizationId?: string;
    source?: DNCSource;
    status?: DNCStatus;
  }): Promise<DNCEntry[]> {
    const where: any = {};
    if (filters?.organizationId) where.organizationId = filters.organizationId;
    if (filters?.source) where.source = filters.source;
    if (filters?.status) where.status = filters.status;

    const entities = await this.repository.find({ where });
    return entities.map(e => this.toDomain(e));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByPhoneNumber(phoneNumber: string, organizationId?: string): Promise<void> {
    const where: any = { phoneNumber };
    if (organizationId) where.organizationId = organizationId;
    await this.repository.delete(where);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  /**
   * Convert TypeORM entity to domain model
   */
  private toDomain(entity: DNCEntryEntity): DNCEntry {
    return new DNCEntry(
      entity.id,
      entity.phoneNumber,
      entity.source as DNCSource,
      entity.status as DNCStatus,
      entity.organizationId ?? undefined,
      {
        reason: entity.reason ?? undefined,
        addedBy: entity.addedBy ?? undefined,
        requestDate: entity.requestDate ?? undefined,
        expirationDate: entity.expirationDate ?? undefined,
      },
      entity.createdAt,
      entity.updatedAt,
      entity.expiresAt ?? undefined,
    );
  }
}
