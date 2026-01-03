/**
 * Get Flow Analytics Use Case
 * 
 * Retrieves analytics for an IVR flow
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { IVRExecutionLogRepositoryPort } from '../ports/ivr-execution-log-repository.port';

@Injectable()
export class GetFlowAnalyticsUseCase {
  constructor(
    @Inject('IVR_FLOW_REPOSITORY')
    private readonly flowRepository: IVRFlowRepositoryPort,
    @Inject('IVR_EXECUTION_LOG_REPOSITORY')
    private readonly executionLogRepository: IVRExecutionLogRepositoryPort,
  ) {}

  async execute(
    flowId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalExecutions: number;
    completed: number;
    failed: number;
    abandoned: number;
    completionRate: number;
    failureRate: number;
    abandonmentRate: number;
    avgDuration: number;
    commonPaths: Array<{ path: string[]; count: number; percentage: number }>;
  }> {
    // Verify flow exists and belongs to organization
    const flow = await this.flowRepository.findById(flowId);

    if (!flow) {
      throw new NotFoundException(`IVR flow with ID '${flowId}' not found`);
    }

    if (flow.organizationId !== organizationId) {
      throw new NotFoundException(`IVR flow with ID '${flowId}' not found`);
    }

    // Get raw analytics
    const analytics = await this.executionLogRepository.getFlowAnalytics(
      flowId,
      startDate,
      endDate,
    );

    // Calculate rates
    const completionRate = analytics.totalExecutions > 0
      ? (analytics.completed / analytics.totalExecutions) * 100
      : 0;

    const failureRate = analytics.totalExecutions > 0
      ? (analytics.failed / analytics.totalExecutions) * 100
      : 0;

    const abandonmentRate = analytics.totalExecutions > 0
      ? (analytics.abandoned / analytics.totalExecutions) * 100
      : 0;

    // Add percentages to paths
    const commonPaths = analytics.commonPaths.map(p => ({
      ...p,
      percentage: analytics.totalExecutions > 0
        ? (p.count / analytics.totalExecutions) * 100
        : 0,
    }));

    return {
      totalExecutions: analytics.totalExecutions,
      completed: analytics.completed,
      failed: analytics.failed,
      abandoned: analytics.abandoned,
      completionRate,
      failureRate,
      abandonmentRate,
      avgDuration: analytics.avgDuration,
      commonPaths,
    };
  }
}
