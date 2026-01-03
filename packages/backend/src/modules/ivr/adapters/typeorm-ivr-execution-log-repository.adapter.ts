/**
 * TypeORM IVR Execution Log Repository Adapter
 * 
 * Implements IVRExecutionLogRepositoryPort using TypeORM
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IVRExecutionLogEntity } from '../../../entities/ivr-execution-log.entity';
import { IVRExecutionLogRepositoryPort } from '../ports/ivr-execution-log-repository.port';
import { IVRExecutionLog, IVRExecutionStatus } from '../domain/ivr-execution-log.domain';

@Injectable()
export class TypeOrmIVRExecutionLogRepositoryAdapter implements IVRExecutionLogRepositoryPort {
  constructor(
    @InjectRepository(IVRExecutionLogEntity)
    private readonly repository: Repository<IVRExecutionLogEntity>,
  ) {}

  async create(log: IVRExecutionLog): Promise<IVRExecutionLog> {
    const entity = this.domainToEntity(log);
    const saved = await this.repository.save(entity);
    return this.entityToDomain(saved);
  }

  async findById(id: string): Promise<IVRExecutionLog | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.entityToDomain(entity) : null;
  }

  async findByCallId(callId: string): Promise<IVRExecutionLog | null> {
    const entity = await this.repository.findOne({ where: { callId } });
    return entity ? this.entityToDomain(entity) : null;
  }

  async findByFlowId(flowId: string, limit?: number): Promise<IVRExecutionLog[]> {
    const query = this.repository
      .createQueryBuilder('log')
      .where('log.flowId = :flowId', { flowId })
      .orderBy('log.startedAt', 'DESC');

    if (limit) {
      query.take(limit);
    }

    const entities = await query.getMany();
    return entities.map(e => this.entityToDomain(e));
  }

  async findByOrganization(
    organizationId: string,
    options?: {
      status?: IVRExecutionStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: IVRExecutionLog[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('log')
      .where('log.organizationId = :organizationId', { organizationId });

    if (options?.status) {
      query.andWhere('log.status = :status', { status: options.status });
    }

    if (options?.startDate && options?.endDate) {
      query.andWhere('log.startedAt BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    }

    query.orderBy('log.startedAt', 'DESC');

    if (options?.limit) {
      query.take(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    const [entities, total] = await query.getManyAndCount();
    const logs = entities.map(e => this.entityToDomain(e));

    return { logs, total };
  }

  async update(log: IVRExecutionLog): Promise<IVRExecutionLog> {
    const entity = this.domainToEntity(log);
    const saved = await this.repository.save(entity);
    return this.entityToDomain(saved);
  }

  async getFlowAnalytics(flowId: string, startDate: Date, endDate: Date): Promise<{
    totalExecutions: number;
    completed: number;
    failed: number;
    abandoned: number;
    avgDuration: number;
    commonPaths: Array<{ path: string[]; count: number }>;
  }> {
    const logs = await this.repository.find({
      where: {
        flowId,
        startedAt: Between(startDate, endDate),
      },
    });

    const domainLogs = logs.map(e => this.entityToDomain(e));

    // Calculate statistics
    const totalExecutions = domainLogs.length;
    const completed = domainLogs.filter(l => l.status === IVRExecutionStatus.COMPLETED).length;
    const failed = domainLogs.filter(l => l.status === IVRExecutionStatus.FAILED).length;
    const abandoned = domainLogs.filter(l => l.status === IVRExecutionStatus.ABANDONED).length;

    const completedLogs = domainLogs.filter(l => l.completedAt);
    const avgDuration = completedLogs.length > 0
      ? completedLogs.reduce((sum, l) => sum + l.getDuration(), 0) / completedLogs.length
      : 0;

    // Find common paths
    const pathCounts = new Map<string, number>();
    for (const log of domainLogs) {
      const pathKey = log.getPath().join('→');
      pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);
    }

    const commonPaths = Array.from(pathCounts.entries())
      .map(([pathStr, count]) => ({
        path: pathStr.split('→'),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 paths

    return {
      totalExecutions,
      completed,
      failed,
      abandoned,
      avgDuration,
      commonPaths,
    };
  }

  /**
   * Entity → Domain conversion
   */
  private entityToDomain(entity: IVRExecutionLogEntity): IVRExecutionLog {
    return new IVRExecutionLog({
      id: entity.id,
      flowId: entity.flowId,
      flowName: entity.flowName,
      callId: entity.callId,
      organizationId: entity.organizationId,
      status: entity.status,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt || undefined,
      steps: entity.steps,
      variables: entity.variables,
      errorMessage: entity.errorMessage || undefined,
      exitReason: entity.exitReason || undefined,
    });
  }

  /**
   * Domain → Entity conversion
   */
  private domainToEntity(domain: IVRExecutionLog): IVRExecutionLogEntity {
    const entity = new IVRExecutionLogEntity();
    entity.id = domain.id;
    entity.flowId = domain.flowId;
    entity.flowName = domain.flowName;
    entity.callId = domain.callId;
    entity.organizationId = domain.organizationId;
    entity.status = domain.status;
    entity.startedAt = domain.startedAt;
    entity.completedAt = domain.completedAt;
    entity.steps = domain.steps;
    entity.variables = domain.variables;
    entity.errorMessage = domain.errorMessage;
    entity.exitReason = domain.exitReason;
    return entity;
  }
}
