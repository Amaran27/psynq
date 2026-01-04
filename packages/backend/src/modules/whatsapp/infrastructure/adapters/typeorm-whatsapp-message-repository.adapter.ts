import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppMessageRepository, FindMessagesFilter } from '../../domain/ports/whatsapp-message-repository.port';
import { WhatsAppMessage, MessageType, MessageStatus, MessageDirection } from '../../domain/whatsapp-message.domain';
import { WhatsAppMessageEntity } from '../persistence/typeorm/entities/whatsapp-message.entity';

@Injectable()
export class TypeOrmWhatsAppMessageRepositoryAdapter implements WhatsAppMessageRepository {
  constructor(
    @InjectRepository(WhatsAppMessageEntity)
    private readonly repository: Repository<WhatsAppMessageEntity>,
  ) {}

  async create(message: WhatsAppMessage): Promise<WhatsAppMessage> {
    const entity = this.toEntity(message);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async createMany(messages: WhatsAppMessage[]): Promise<WhatsAppMessage[]> {
    const entities = messages.map(m => this.toEntity(m));
    const saved = await this.repository.save(entities);
    return saved.map(e => this.toDomain(e));
  }

  async findById(id: string): Promise<WhatsAppMessage | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindMessagesFilter): Promise<WhatsAppMessage[]> {
    const qb = this.repository.createQueryBuilder('message');

    if (filter) {
      if (filter.organizationId) {
        qb.andWhere('message.organizationId = :organizationId', { organizationId: filter.organizationId });
      }
      if (filter.phoneNumber) {
        qb.andWhere('message.phoneNumber = :phoneNumber', { phoneNumber: filter.phoneNumber });
      }
      if (filter.conversationId) {
        qb.andWhere('message.conversationId = :conversationId', { conversationId: filter.conversationId });
      }
      if (filter.contactId) {
        qb.andWhere('message.contactId = :contactId', { contactId: filter.contactId });
      }
      if (filter.campaignId) {
        qb.andWhere('message.campaignId = :campaignId', { campaignId: filter.campaignId });
      }
      if (filter.agentId) {
        qb.andWhere('message.agentId = :agentId', { agentId: filter.agentId });
      }
      if (filter.status) {
        qb.andWhere('message.status = :status', { status: filter.status });
      }
      if (filter.direction) {
        qb.andWhere('message.direction = :direction', { direction: filter.direction });
      }
      if (filter.type) {
        qb.andWhere('message.type = :type', { type: filter.type });
      }
      if (filter.startDate) {
        qb.andWhere('message.createdAt >= :startDate', { startDate: filter.startDate });
      }
      if (filter.endDate) {
        qb.andWhere('message.createdAt <= :endDate', { endDate: filter.endDate });
      }
    }

    qb.orderBy('message.createdAt', 'DESC');
    const entities = await qb.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findByOrganization(organizationId: string): Promise<WhatsAppMessage[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByPhoneNumber(phoneNumber: string): Promise<WhatsAppMessage[]> {
    const entities = await this.repository.find({
      where: { phoneNumber },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByConversation(conversationId: string): Promise<WhatsAppMessage[]> {
    const entities = await this.repository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByContact(contactId: string): Promise<WhatsAppMessage[]> {
    const entities = await this.repository.find({
      where: { contactId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByExternalId(externalMessageId: string): Promise<WhatsAppMessage | null> {
    const entity = await this.repository.findOne({ where: { externalMessageId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findPending(): Promise<WhatsAppMessage[]> {
    const entities = await this.repository.find({
      where: { status: MessageStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async update(message: WhatsAppMessage): Promise<WhatsAppMessage> {
    const entity = this.toEntity(message);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindMessagesFilter): Promise<number> {
    const qb = this.repository.createQueryBuilder('message');

    if (filter) {
      if (filter.organizationId) {
        qb.andWhere('message.organizationId = :organizationId', { organizationId: filter.organizationId });
      }
      if (filter.status) {
        qb.andWhere('message.status = :status', { status: filter.status });
      }
      if (filter.direction) {
        qb.andWhere('message.direction = :direction', { direction: filter.direction });
      }
    }

    return qb.getCount();
  }

  private toEntity(domain: WhatsAppMessage): WhatsAppMessageEntity {
    const entity = new WhatsAppMessageEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.phoneNumber = domain.phoneNumber;
    entity.type = domain.type as any;
    entity.direction = domain.direction as any;
    entity.status = domain.status as any;
    entity.content = domain.content;
    entity.conversationId = domain.conversationId || null;
    entity.contactId = domain.contactId || null;
    entity.campaignId = domain.campaignId || null;
    entity.agentId = domain.agentId || null;
    entity.templateId = domain.templateId || null;
    entity.mediaUrl = domain.mediaUrl || null;
    entity.mediaType = domain.mediaType || null;
    entity.mediaSizeBytes = domain.mediaSizeBytes || null;
    entity.externalMessageId = domain.externalMessageId || null;
    entity.externalTimestamp = domain.externalTimestamp || null;
    entity.deliveredAt = domain.deliveredAt || null;
    entity.readAt = domain.readAt || null;
    entity.failedReason = domain.failedReason || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: WhatsAppMessageEntity): WhatsAppMessage {
    return new WhatsAppMessage(
      entity.id,
      entity.organizationId,
      entity.phoneNumber,
      entity.type as MessageType,
      entity.direction as MessageDirection,
      entity.status as MessageStatus,
      entity.content,
      entity.conversationId ?? undefined,
      entity.contactId ?? undefined,
      entity.campaignId ?? undefined,
      entity.agentId ?? undefined,
      entity.templateId ?? undefined,
      entity.mediaUrl ?? undefined,
      entity.mediaType ?? undefined,
      entity.mediaSizeBytes ?? undefined,
      entity.externalMessageId ?? undefined,
      entity.externalTimestamp ?? undefined,
      entity.deliveredAt ?? undefined,
      entity.readAt ?? undefined,
      entity.failedReason ?? undefined,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
