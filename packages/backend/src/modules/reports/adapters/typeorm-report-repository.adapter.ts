import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReportRepositoryPort,
  FindReportTemplatesFilter,
} from '../ports/report-repository.port';
import { ReportTemplate } from '../domain/report-template.domain';
import { ReportTemplateEntity, ReportStatus } from '../../../entities/reports/report-template.entity';

@Injectable()
export class TypeOrmReportRepositoryAdapter implements ReportRepositoryPort {
  constructor(
    @InjectRepository(ReportTemplateEntity)
    private readonly repository: Repository<ReportTemplateEntity>,
  ) {}

  async create(template: ReportTemplate): Promise<ReportTemplate> {
    const entity = this.toEntity(template);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<ReportTemplate | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter: FindReportTemplatesFilter): Promise<ReportTemplate[]> {
    const query = this.repository.createQueryBuilder('template');

    if (filter.organizationId) {
      query.andWhere('template.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }

    if (filter.status) {
      query.andWhere('template.status = :status', { status: filter.status });
    }

    if (filter.type) {
      query.andWhere('template.type = :type', { type: filter.type });
    }

    if (filter.createdBy) {
      query.andWhere('template.createdBy = :createdBy', {
        createdBy: filter.createdBy,
      });
    }

    const entities = await query.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByOrganization(organizationId: string): Promise<ReportTemplate[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findActiveByOrganization(
    organizationId: string,
  ): Promise<ReportTemplate[]> {
    const entities = await this.repository.find({
      where: { organizationId, status: ReportStatus.ACTIVE },
      order: { name: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findScheduled(): Promise<ReportTemplate[]> {
    const entities = await this.repository.find({
      where: { isScheduled: true, status: ReportStatus.ACTIVE },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(template: ReportTemplate): Promise<ReportTemplate> {
    const entity = this.toEntity(template);
    entity.updatedAt = new Date();
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter: FindReportTemplatesFilter): Promise<number> {
    const query = this.repository.createQueryBuilder('template');

    if (filter.organizationId) {
      query.andWhere('template.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }

    if (filter.status) {
      query.andWhere('template.status = :status', { status: filter.status });
    }

    if (filter.type) {
      query.andWhere('template.type = :type', { type: filter.type });
    }

    if (filter.createdBy) {
      query.andWhere('template.createdBy = :createdBy', {
        createdBy: filter.createdBy,
      });
    }

    return await query.getCount();
  }

  private toEntity(domain: ReportTemplate): ReportTemplateEntity {
    const entity = new ReportTemplateEntity();
    if (domain.id) {
      entity.id = domain.id;
    }
    entity.name = domain.name;
    entity.description = (domain.description || undefined) as any;
    entity.type = domain.type;
    entity.status = domain.status;
    entity.organizationId = domain.organizationId;
    entity.createdBy = (domain.createdBy || undefined) as any;
    entity.queryTemplate = (domain.queryTemplate || undefined) as any;
    entity.parameters = domain.parameters as any;
    entity.columns = domain.columns as any;
    entity.filters = domain.filters as any;
    entity.sorting = domain.sorting as any;
    entity.groupBy = (domain.groupBy || undefined) as any;
    entity.dateRangeType = domain.dateRangeType;
    entity.customStartDate = (domain.customStartDate || undefined) as any;
    entity.customEndDate = (domain.customEndDate || undefined) as any;
    entity.supportedFormats = domain.supportedFormats;
    entity.defaultFormat = domain.defaultFormat;
    entity.isScheduled = domain.isScheduled;
    entity.scheduleExpression = (domain.scheduleExpression || undefined) as any;
    entity.emailRecipients = domain.emailRecipients as any;
    entity.executionCount = domain.executionCount;
    entity.lastExecutedAt = (domain.lastExecutedAt || undefined) as any;
    entity.lastExecutionDurationMs = (domain.lastExecutionDurationMs || undefined) as any;
    entity.layoutConfig = domain.layoutConfig as any;
    if (domain.createdAt) {
      entity.createdAt = domain.createdAt;
    }
    if (domain.updatedAt) {
      entity.updatedAt = domain.updatedAt;
    }
    return entity;
  }

  private toDomain(entity: ReportTemplateEntity): ReportTemplate {
    return new ReportTemplate({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      status: entity.status,
      organizationId: entity.organizationId,
      createdBy: entity.createdBy,
      queryTemplate: entity.queryTemplate,
      parameters: entity.parameters,
      columns: entity.columns,
      filters: entity.filters,
      sorting: entity.sorting,
      groupBy: entity.groupBy,
      dateRangeType: entity.dateRangeType,
      customStartDate: entity.customStartDate,
      customEndDate: entity.customEndDate,
      supportedFormats: entity.supportedFormats,
      defaultFormat: entity.defaultFormat,
      isScheduled: entity.isScheduled,
      scheduleExpression: entity.scheduleExpression,
      emailRecipients: entity.emailRecipients,
      executionCount: entity.executionCount,
      lastExecutedAt: entity.lastExecutedAt,
      lastExecutionDurationMs: entity.lastExecutionDurationMs,
      layoutConfig: entity.layoutConfig,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
