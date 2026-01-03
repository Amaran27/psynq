/**
 * IVR Execution Log Repository Port (Domain Interface)
 */

import { IVRExecutionLog, IVRExecutionStatus } from '../domain/ivr-execution-log.domain';

export interface IVRExecutionLogRepositoryPort {
  /**
   * Create a new execution log
   */
  create(log: IVRExecutionLog): Promise<IVRExecutionLog>;

  /**
   * Find log by ID
   */
  findById(id: string): Promise<IVRExecutionLog | null>;

  /**
   * Find log by call ID
   */
  findByCallId(callId: string): Promise<IVRExecutionLog | null>;

  /**
   * Find logs by flow ID
   */
  findByFlowId(flowId: string, limit?: number): Promise<IVRExecutionLog[]>;

  /**
   * Find logs by organization
   */
  findByOrganization(
    organizationId: string,
    options?: {
      status?: IVRExecutionStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: IVRExecutionLog[]; total: number }>;

  /**
   * Update execution log
   */
  update(log: IVRExecutionLog): Promise<IVRExecutionLog>;

  /**
   * Get execution analytics for a flow
   */
  getFlowAnalytics(flowId: string, startDate: Date, endDate: Date): Promise<{
    totalExecutions: number;
    completed: number;
    failed: number;
    abandoned: number;
    avgDuration: number;
    commonPaths: Array<{ path: string[]; count: number }>;
  }>;
}
