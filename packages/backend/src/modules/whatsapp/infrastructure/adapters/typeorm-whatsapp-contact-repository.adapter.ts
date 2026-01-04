import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WhatsAppContactRepository, FindContactsFilter } from '../../domain/ports/whatsapp-contact-repository.port';
import { WhatsAppContact, ContactStatus } from '../../domain/whatsapp-contact.domain';
import { WhatsAppContactEntity } from '../persistence/typeorm/entities/whatsapp-contact.entity';

@Injectable()
export class TypeOrmWhatsAppContactRepositoryAdapter implements WhatsAppContactRepository {
  constructor(
    @InjectRepository(WhatsAppContactEntity)
    private readonly repository: Repository<WhatsAppContactEntity>,
  ) {}

  async create(contact: WhatsAppContact): Promise<WhatsAppContact> {
    const entity = this.toEntity(contact);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<WhatsAppContact | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindContactsFilter): Promise<WhatsAppContact[]> {
    const qb = this.repository.createQueryBuilder('contact');

    if (filter) {
      if (filter.organizationId) {
        qb.andWhere('contact.organizationId = :organizationId', { organizationId: filter.organizationId });
      }
      if (filter.phoneNumber) {
        qb.andWhere('contact.phoneNumber = :phoneNumber', { phoneNumber: filter.phoneNumber });
      }
      if (filter.status) {
        qb.andWhere('contact.status = :status', { status: filter.status });
      }
      if (filter.tags && filter.tags.length > 0) {
        qb.andWhere('contact.tags @> :tags', { tags: JSON.stringify(filter.tags) });
      }
    }

    qb.orderBy('contact.lastMessageAt', 'DESC', 'NULLS LAST');
    const entities = await qb.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findByOrganization(organizationId: string): Promise<WhatsAppContact[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { lastMessageAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByPhoneNumber(organizationId: string, phoneNumber: string): Promise<WhatsAppContact | null> {
    const entity = await this.repository.findOne({
      where: { organizationId, phoneNumber },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findActive(organizationId: string): Promise<WhatsAppContact[]> {
    const entities = await this.repository.find({
      where: { organizationId, status: ContactStatus.ACTIVE },
      order: { lastMessageAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByTags(organizationId: string, tags: string[]): Promise<WhatsAppContact[]> {
    const qb = this.repository.createQueryBuilder('contact');
    qb.where('contact.organizationId = :organizationId', { organizationId });
    qb.andWhere('contact.tags @> :tags', { tags: JSON.stringify(tags) });
    qb.orderBy('contact.lastMessageAt', 'DESC', 'NULLS LAST');

    const entities = await qb.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async update(contact: WhatsAppContact): Promise<WhatsAppContact> {
    const entity = this.toEntity(contact);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindContactsFilter): Promise<number> {
    const qb = this.repository.createQueryBuilder('contact');

    if (filter) {
      if (filter.organizationId) {
        qb.andWhere('contact.organizationId = :organizationId', { organizationId: filter.organizationId });
      }
      if (filter.status) {
        qb.andWhere('contact.status = :status', { status: filter.status });
      }
    }

    return qb.getCount();
  }

  private toEntity(domain: WhatsAppContact): WhatsAppContactEntity {
    const entity = new WhatsAppContactEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.phoneNumber = domain.phoneNumber;
    entity.status = domain.status as any;
    entity.name = domain.name || null;
    entity.profilePictureUrl = domain.profilePictureUrl || null;
    entity.lastMessageAt = domain.lastMessageAt || null;
    entity.lastMessageDirection = domain.lastMessageDirection || null;
    entity.messageCount = domain.messageCount;
    entity.optedOutAt = domain.optedOutAt || null;
    entity.blockedAt = domain.blockedAt || null;
    entity.blockReason = domain.blockReason || null;
    entity.tags = domain.tags;
    entity.customFields = domain.customFields || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: WhatsAppContactEntity): WhatsAppContact {
    return new WhatsAppContact(
      entity.id,
      entity.organizationId,
      entity.phoneNumber,
      entity.status as ContactStatus,
      entity.name ?? undefined,
      entity.profilePictureUrl ?? undefined,
      entity.lastMessageAt ?? undefined,
      entity.lastMessageDirection as 'inbound' | 'outbound' | undefined,
      entity.messageCount,
      entity.optedOutAt ?? undefined,
      entity.blockedAt ?? undefined,
      entity.blockReason ?? undefined,
      entity.tags,
      entity.customFields ?? undefined,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
