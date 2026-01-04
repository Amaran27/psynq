/**
 * IVR Flow Repository Adapter
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IVRFlowRepository, FlowFilters } from '../../domain/ports/ivr-flow.repository';
import { IVRFlow, FlowStatus } from '../../domain/ivr-flow.domain';
import { IVRFlowEntity } from './ivr-flow.entity';

@Injectable()
export class IVRFlowRepositoryAdapter implements IVRFlowRepository {
  constructor(
    @InjectRepository(IVRFlowEntity)
    private readonly repository: Repository<IVRFlowEntity>,
  ) {}

  async create(flow: IVRFlow): Promise<IVRFlow> {
    const entity = this.toEntity(flow);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string, organizationId: string): Promise<IVRFlow | null> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganization(organizationId: string, filters?: FlowFilters): Promise<IVRFlow[]> {
    const query = this.repository
      .createQueryBuilder('flow')
      .where('flow.organizationId = :organizationId', { organizationId });

    if (filters?.status) {
      query.andWhere('flow.status = :status', { status: filters.status });
    }
    if (filters?.search) {
      query.andWhere('flow.name ILIKE :search', { search: `%${filters.search}%` });
    }

    const entities = await query.orderBy('flow.updatedAt', 'DESC').getMany();
    return entities.map(e => this.toDomain(e));
  }

  async update(flow: IVRFlow): Promise<IVRFlow> {
    const entity = this.toEntity(flow);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

  async getStatistics(organizationId: string): Promise<{
    total: number;
    draft: number;
    published: number;
    archived: number;
  }> {
    const [total, draft, published, archived] = await Promise.all([
      this.repository.count({ where: { organizationId } }),
      this.repository.count({ where: { organizationId, status: FlowStatus.DRAFT } }),
      this.repository.count({ where: { organizationId, status: FlowStatus.PUBLISHED } }),
      this.repository.count({ where: { organizationId, status: FlowStatus.ARCHIVED } }),
    ]);

    return { total, draft, published, archived };
  }

  private toEntity(domain: IVRFlow): IVRFlowEntity {
    const entity = new IVRFlowEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.name = domain.name;
    entity.description = domain.description;
    entity.status = domain.status;
    entity.nodes = domain.nodes;
    entity.connections = domain.connections;
    entity.variables = domain.variables;
    entity.startNodeId = domain.startNodeId;
    entity.version = domain.version;
    entity.metadata = domain.metadata;
    if (domain.createdAt) entity.createdAt = domain.createdAt;
    if (domain.updatedAt) entity.updatedAt = domain.updatedAt;
    if (domain.publishedAt) entity.publishedAt = domain.publishedAt;
    return entity;
  }

  private toDomain(entity: IVRFlowEntity): IVRFlow {
    return new IVRFlow(
      entity.id,
      entity.organizationId,
      entity.name,
      entity.description,
      entity.status as FlowStatus,
      entity.nodes,
      entity.connections,
      entity.variables || [],
      entity.startNodeId,
      entity.version,
      entity.metadata,
      entity.createdAt,
      entity.updatedAt,
      entity.publishedAt || undefined,
    );
  }
}
