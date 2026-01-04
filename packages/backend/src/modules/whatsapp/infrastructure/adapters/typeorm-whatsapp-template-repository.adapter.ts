import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppTemplateRepository, FindTemplatesFilter } from '../../domain/ports/whatsapp-template-repository.port';
import { WhatsAppTemplate, TemplateCategory, TemplateLanguage, TemplateStatus } from '../../domain/whatsapp-template.domain';
import { WhatsAppTemplateEntity } from '../persistence/typeorm/entities/whatsapp-template.entity';

@Injectable()
export class TypeOrmWhatsAppTemplateRepositoryAdapter implements WhatsAppTemplateRepository {
  constructor(
    @InjectRepository(WhatsAppTemplateEntity)
    private readonly repository: Repository<WhatsAppTemplateEntity>,
  ) {}

  async create(template: WhatsAppTemplate): Promise<WhatsAppTemplate> {
    const entity = this.toEntity(template);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<WhatsAppTemplate | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindTemplatesFilter): Promise<WhatsAppTemplate[]> {
    const qb = this.repository.createQueryBuilder('template');

    if (filter) {
      if (filter.organizationId) {
        qb.andWhere('template.organizationId = :organizationId', { organizationId: filter.organizationId });
      }
      if (filter.name) {
        qb.andWhere('template.name = :name', { name: filter.name });
      }
      if (filter.category) {
        qb.andWhere('template.category = :category', { category: filter.category });
      }
      if (filter.language) {
        qb.andWhere('template.language = :language', { language: filter.language });
      }
      if (filter.status) {
        qb.andWhere('template.status = :status', { status: filter.status });
      }
    }

    qb.orderBy('template.createdAt', 'DESC');
    const entities = await qb.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findByOrganization(organizationId: string): Promise<WhatsAppTemplate[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByName(organizationId: string, name: string): Promise<WhatsAppTemplate | null> {
    const entity = await this.repository.findOne({
      where: { organizationId, name },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByExternalId(externalTemplateId: string): Promise<WhatsAppTemplate | null> {
    const entity = await this.repository.findOne({ where: { externalTemplateId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findApproved(organizationId: string): Promise<WhatsAppTemplate[]> {
    const entities = await this.repository.find({
      where: { organizationId, status: TemplateStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async update(template: WhatsAppTemplate): Promise<WhatsAppTemplate> {
    const entity = this.toEntity(template);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindTemplatesFilter): Promise<number> {
    const qb = this.repository.createQueryBuilder('template');

    if (filter) {
      if (filter.organizationId) {
        qb.andWhere('template.organizationId = :organizationId', { organizationId: filter.organizationId });
      }
      if (filter.status) {
        qb.andWhere('template.status = :status', { status: filter.status });
      }
    }

    return qb.getCount();
  }

  private toEntity(domain: WhatsAppTemplate): WhatsAppTemplateEntity {
    const entity = new WhatsAppTemplateEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.name = domain.name;
    entity.category = domain.category as any;
    entity.language = domain.language as any;
    entity.status = domain.status as any;
    entity.components = domain.components;
    entity.externalTemplateId = domain.externalTemplateId || null;
    entity.externalTemplateName = domain.externalTemplateName || null;
    entity.rejectionReason = domain.rejectionReason || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: WhatsAppTemplateEntity): WhatsAppTemplate {
    return new WhatsAppTemplate(
      entity.id,
      entity.organizationId,
      entity.name,
      entity.category as TemplateCategory,
      entity.language as TemplateLanguage,
      entity.status as TemplateStatus,
      entity.components,
      entity.externalTemplateId ?? undefined,
      entity.externalTemplateName ?? undefined,
      entity.rejectionReason ?? undefined,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
