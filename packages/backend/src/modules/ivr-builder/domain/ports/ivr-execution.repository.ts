/**
 * IVR Execution Repository Port
 */

import { IVRExecution } from '../ivr-execution.domain';

export interface ExecutionFilters {
  flowId?: string;
  callId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IVRExecutionRepository {
  create(execution: IVRExecution): Promise<IVRExecution>;
  findById(id: string, organizationId: string): Promise<IVRExecution | null>;
  findByOrganization(organizationId: string, filters?: ExecutionFilters): Promise<IVRExecution[]>;
  update(execution: IVRExecution): Promise<IVRExecution>;
  delete(id: string, organizationId: string): Promise<void>;
  
  getFlowStatistics(flowId: string, organizationId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    failureRate: number;
  }>;
}

export const IVR_EXECUTION_REPOSITORY = Symbol('IVR_EXECUTION_REPOSITORY');
