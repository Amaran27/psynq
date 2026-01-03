/**
 * IVR Execution Log Domain Model (Pure TypeScript)
 * 
 * Records the execution of IVR flows for analytics and debugging
 */

export enum IVRExecutionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
}

export interface IVRExecutionStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  timestamp: Date;
  input?: string; // User input (DTMF digits)
  output?: string; // System response (prompt text)
  duration: number; // milliseconds
  error?: string;
}

export class IVRExecutionLog {
  id: string;
  flowId: string;
  flowName: string;
  callId: string;
  organizationId: string;
  status: IVRExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  steps: IVRExecutionStep[];
  variables: Record<string, string>; // Flow variables during execution
  errorMessage?: string;
  exitReason?: string; // 'completed', 'hangup', 'transfer', 'error'

  constructor(data: {
    id: string;
    flowId: string;
    flowName: string;
    callId: string;
    organizationId: string;
    status: IVRExecutionStatus;
    startedAt: Date;
    completedAt?: Date;
    steps?: IVRExecutionStep[];
    variables?: Record<string, string>;
    errorMessage?: string;
    exitReason?: string;
  }) {
    this.id = data.id;
    this.flowId = data.flowId;
    this.flowName = data.flowName;
    this.callId = data.callId;
    this.organizationId = data.organizationId;
    this.status = data.status;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.steps = data.steps || [];
    this.variables = data.variables || {};
    this.errorMessage = data.errorMessage;
    this.exitReason = data.exitReason;
  }

  /**
   * Business Logic: Add execution step
   */
  addStep(step: IVRExecutionStep): void {
    this.steps.push(step);
  }

  /**
   * Business Logic: Complete execution
   */
  complete(exitReason: string): void {
    this.status = IVRExecutionStatus.COMPLETED;
    this.completedAt = new Date();
    this.exitReason = exitReason;
  }

  /**
   * Business Logic: Mark as failed
   */
  fail(errorMessage: string): void {
    this.status = IVRExecutionStatus.FAILED;
    this.completedAt = new Date();
    this.errorMessage = errorMessage;
    this.exitReason = 'error';
  }

  /**
   * Business Logic: Mark as abandoned (caller hung up)
   */
  abandon(): void {
    this.status = IVRExecutionStatus.ABANDONED;
    this.completedAt = new Date();
    this.exitReason = 'hangup';
  }

  /**
   * Business Logic: Get total execution duration
   */
  getDuration(): number {
    if (!this.completedAt) return Date.now() - this.startedAt.getTime();
    return this.completedAt.getTime() - this.startedAt.getTime();
  }

  /**
   * Business Logic: Get current node
   */
  getCurrentNode(): IVRExecutionStep | undefined {
    return this.steps[this.steps.length - 1];
  }

  /**
   * Business Logic: Get path taken (node IDs)
   */
  getPath(): string[] {
    return this.steps.map(step => step.nodeId);
  }
}
