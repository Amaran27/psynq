/**
 * Flow Execution Service
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IVR_EXECUTION_REPOSITORY, IVRExecutionRepository, ExecutionFilters } from '../domain/ports/ivr-execution.repository';
import { IVR_FLOW_REPOSITORY, IVRFlowRepository } from '../domain/ports/ivr-flow.repository';
import { IVRExecution, ExecutionStatus, ExecutionStep } from '../domain/ivr-execution.domain';
import { FlowStatus } from '../domain/ivr-flow.domain';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FlowExecutionService {
  constructor(
    @Inject(IVR_EXECUTION_REPOSITORY)
    private readonly executionRepository: IVRExecutionRepository,
    @Inject(IVR_FLOW_REPOSITORY)
    private readonly flowRepository: IVRFlowRepository,
  ) {}

  async startExecution(
    organizationId: string,
    flowId: string,
    callId: string,
    initialContext?: Record<string, any>,
  ): Promise<IVRExecution> {
    // Validate flow exists and is published
    const flow = await this.flowRepository.findById(flowId, organizationId);
    if (!flow) {
      throw new NotFoundException(`Flow ${flowId} not found`);
    }
    if (flow.status !== FlowStatus.PUBLISHED) {
      throw new Error('Can only execute published flows');
    }

    const execution = new IVRExecution(
      uuidv4(),
      flowId,
      organizationId,
      callId,
      ExecutionStatus.RUNNING,
      flow.startNodeId,
      initialContext || {},
      [],
      new Date(),
    );

    return await this.executionRepository.create(execution);
  }

  async recordStep(
    executionId: string,
    organizationId: string,
    step: ExecutionStep,
  ): Promise<IVRExecution> {
    const execution = await this.findById(executionId, organizationId);
    
    if (!execution.isActive()) {
      throw new Error('Cannot record step for inactive execution');
    }

    execution.recordStep(step);
    return await this.executionRepository.update(execution);
  }

  async updateContext(
    executionId: string,
    organizationId: string,
    key: string,
    value: any,
  ): Promise<IVRExecution> {
    const execution = await this.findById(executionId, organizationId);
    execution.updateContext(key, value);
    return await this.executionRepository.update(execution);
  }

  async completeExecution(executionId: string, organizationId: string): Promise<IVRExecution> {
    const execution = await this.findById(executionId, organizationId);
    execution.complete();
    return await this.executionRepository.update(execution);
  }

  async failExecution(executionId: string, organizationId: string, error: string): Promise<IVRExecution> {
    const execution = await this.findById(executionId, organizationId);
    execution.fail(error);
    return await this.executionRepository.update(execution);
  }

  async timeoutExecution(executionId: string, organizationId: string): Promise<IVRExecution> {
    const execution = await this.findById(executionId, organizationId);
    execution.timeout();
    return await this.executionRepository.update(execution);
  }

  async abandonExecution(executionId: string, organizationId: string): Promise<IVRExecution> {
    const execution = await this.findById(executionId, organizationId);
    execution.abandon();
    return await this.executionRepository.update(execution);
  }

  async findById(id: string, organizationId: string): Promise<IVRExecution> {
    const execution = await this.executionRepository.findById(id, organizationId);
    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }
    return execution;
  }

  async findByOrganization(organizationId: string, filters?: ExecutionFilters): Promise<IVRExecution[]> {
    return await this.executionRepository.findByOrganization(organizationId, filters);
  }

  async getFlowStatistics(flowId: string, organizationId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    failureRate: number;
  }> {
    return await this.executionRepository.getFlowStatistics(flowId, organizationId);
  }
}
