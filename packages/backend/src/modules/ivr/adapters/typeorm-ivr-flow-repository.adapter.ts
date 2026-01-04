/**
 * TypeORM IVR Flow Repository Adapter
 * 
 * Implements IVRFlowRepositoryPort using TypeORM
 * Handles entity ↔ domain conversions
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IVRFlowEntity } from '../../../entities/ivr-flow.entity';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { IVRFlow, IVRFlowStatus } from '../domain/ivr-flow.domain';

@Injectable()
export class TypeOrmIVRFlowRepositoryAdapter implements IVRFlowRepositoryPort {
  constructor(
    @InjectRepository(IVRFlowEntity)
    private readonly repository: Repository<IVRFlowEntity>,
  ) {}

  async create(flow: IVRFlow): Promise<IVRFlow> {
    const entity = this.domainToEntity(flow);
    const saved = await this.repository.save(entity);
    return this.entityToDomain(saved);
  }

  async findById(id: string): Promise<IVRFlow | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.entityToDomain(entity) : null;
  }

  async findByOrganization(organizationId: string, status?: IVRFlowStatus): Promise<IVRFlow[]> {
    const where: any = { organizationId };
    if (status) {
      where.status = status;
    }
    const entities = await this.repository.find({ where, order: { updatedAt: 'DESC' } });
    return entities.map(e => this.entityToDomain(e));
  }

  async findActiveByName(organizationId: string, name: string): Promise<IVRFlow | null> {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
        name,
        status: IVRFlowStatus.ACTIVE,
      },
    });
    return entity ? this.entityToDomain(entity) : null;
  }

  async update(flow: IVRFlow): Promise<IVRFlow> {
    const entity = this.domainToEntity(flow);
    const saved = await this.repository.save(entity);
    return this.entityToDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async existsByName(organizationId: string, name: string, excludeId?: string): Promise<boolean> {
    const query = this.repository.createQueryBuilder('flow')
      .where('flow.organizationId = :organizationId', { organizationId })
      .andWhere('flow.name = :name', { name });
    
    if (excludeId) {
      query.andWhere('flow.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async list(options: {
    organizationId?: string;
    status?: IVRFlowStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ flows: IVRFlow[]; total: number }> {
    const query = this.repository.createQueryBuilder('flow');

    if (options.organizationId) {
      query.andWhere('flow.organizationId = :organizationId', { organizationId: options.organizationId });
    }

    if (options.status) {
      query.andWhere('flow.status = :status', { status: options.status });
    }

    query.orderBy('flow.updatedAt', 'DESC');

    if (options.limit) {
      query.take(options.limit);
    }

    if (options.offset) {
      query.skip(options.offset);
    }

    const [entities, total] = await query.getManyAndCount();
    const flows = entities.map(e => this.entityToDomain(e));

    return { flows, total };
  }

  /**
   * Entity → Domain conversion
   */
  private entityToDomain(entity: IVRFlowEntity): IVRFlow {
    return new IVRFlow({
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      description: entity.description || undefined,
      status: entity.status,
      entryNodeId: entity.entryNodeId,
      nodes: entity.nodes,
      variables: entity.variables,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy || undefined,
    });
  }

  /**
   * Domain → Entity conversion
   */
  private domainToEntity(domain: IVRFlow): IVRFlowEntity {
    const entity = new IVRFlowEntity();
    // Don't set ID for new entities - let database generate it
    if (domain.id) {
      entity.id = domain.id;
    }
    entity.organizationId = domain.organizationId;
    entity.name = domain.name;
    entity.description = domain.description;
    entity.status = domain.status;
    entity.entryNodeId = domain.entryNodeId;
    entity.nodes = domain.nodes;
    entity.variables = domain.variables;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.createdBy = domain.createdBy;
    return entity;
  }
}
