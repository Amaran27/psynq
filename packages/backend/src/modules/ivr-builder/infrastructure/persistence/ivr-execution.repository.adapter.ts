/**
 * IVR Execution Repository Adapter
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IVRExecutionRepository, ExecutionFilters } from '../../domain/ports/ivr-execution.repository';
import { IVRExecution, ExecutionStatus } from '../../domain/ivr-execution.domain';
import { IVRExecutionEntity } from './ivr-execution.entity';

@Injectable()
export class IVRExecutionRepositoryAdapter implements IVRExecutionRepository {
  constructor(
    @InjectRepository(IVRExecutionEntity)
    private readonly repository: Repository<IVRExecutionEntity>,
  ) {}

  async create(execution: IVRExecution): Promise<IVRExecution> {
    const entity = this.toEntity(execution);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string, organizationId: string): Promise<IVRExecution | null> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganization(organizationId: string, filters?: ExecutionFilters): Promise<IVRExecution[]> {
    const query = this.repository
      .createQueryBuilder('execution')
      .where('execution.organizationId = :organizationId', { organizationId });

    if (filters?.flowId) {
      query.andWhere('execution.flowId = :flowId', { flowId: filters.flowId });
    }
    if (filters?.callId) {
      query.andWhere('execution.callId = :callId', { callId: filters.callId });
    }
    if (filters?.status) {
      query.andWhere('execution.status = :status', { status: filters.status });
    }
    if (filters?.startDate && filters?.endDate) {
      query.andWhere('execution.startedAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const entities = await query.orderBy('execution.startedAt', 'DESC').getMany();
    return entities.map(e => this.toDomain(e));
  }

  async update(execution: IVRExecution): Promise<IVRExecution> {
    const entity = this.toEntity(execution);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

  async getFlowStatistics(flowId: string, organizationId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    failureRate: number;
  }> {
    const executions = await this.repository.find({
      where: { flowId, organizationId },
    });

    const totalExecutions = executions.length;
    if (totalExecutions === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        failureRate: 0,
      };
    }

    const completed = executions.filter(e => e.status === ExecutionStatus.COMPLETED).length;
    const failed = executions.filter(e => e.status === ExecutionStatus.FAILED).length;

    const durations = executions
      .filter(e => e.completedAt)
      .map(e => {
        const start = new Date(e.startedAt).getTime();
        const end = new Date(e.completedAt!).getTime();
        return (end - start) / 1000; // seconds
      });

    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    return {
      totalExecutions,
      successRate: (completed / totalExecutions) * 100,
      averageDuration: Math.round(averageDuration),
      failureRate: (failed / totalExecutions) * 100,
    };
  }

  private toEntity(domain: IVRExecution): IVRExecutionEntity {
    const entity = new IVRExecutionEntity();
    entity.id = domain.id;
    entity.flowId = domain.flowId;
    entity.organizationId = domain.organizationId;
    entity.callId = domain.callId;
    entity.status = domain.status;
    entity.currentNodeId = domain.currentNodeId;
    entity.context = domain.context;
    entity.steps = domain.steps;
    entity.startedAt = domain.startedAt;
    entity.completedAt = domain.completedAt || null;
    entity.errorMessage = domain.errorMessage || null;
    entity.metadata = domain.metadata;
    return entity;
  }

  private toDomain(entity: IVRExecutionEntity): IVRExecution {
    return new IVRExecution(
      entity.id,
      entity.flowId,
      entity.organizationId,
      entity.callId,
      entity.status as ExecutionStatus,
      entity.currentNodeId,
      entity.context,
      entity.steps,
      entity.startedAt,
      entity.completedAt || undefined,
      entity.errorMessage || undefined,
      entity.metadata,
    );
  }
}
