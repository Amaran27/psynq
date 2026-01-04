/**
 * IVR Execution Domain Model
 * 
 * Tracks runtime execution of an IVR flow
 */

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  ABANDONED = 'abandoned',
}

export interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  timestamp: Date;
  input?: string;
  output?: string;
  duration?: number;      // Milliseconds
  error?: string;
}

export interface ExecutionContext {
  [key: string]: any;     // Dynamic variables
}

export class IVRExecution {
  constructor(
    public readonly id: string,
    public readonly flowId: string,
    public readonly organizationId: string,
    public readonly callId: string,
    public status: ExecutionStatus,
    public currentNodeId: string,
    public context: ExecutionContext,
    public steps: ExecutionStep[],
    public startedAt: Date,
    public completedAt?: Date,
    public errorMessage?: string,
    public metadata?: Record<string, any>,
  ) {}

  /**
   * Record a step in execution
   */
  recordStep(step: ExecutionStep): void {
    this.steps.push(step);
    this.currentNodeId = step.nodeId;
  }

  /**
   * Update execution context
   */
  updateContext(key: string, value: any): void {
    this.context[key] = value;
  }

  /**
   * Get context variable
   */
  getContextValue(key: string): any {
    return this.context[key];
  }

  /**
   * Complete execution successfully
   */
  complete(): void {
    if (this.status !== ExecutionStatus.RUNNING) {
      throw new Error('Cannot complete non-running execution');
    }

    this.status = ExecutionStatus.COMPLETED;
    this.completedAt = new Date();
  }

  /**
   * Mark execution as failed
   */
  fail(error: string): void {
    this.status = ExecutionStatus.FAILED;
    this.errorMessage = error;
    this.completedAt = new Date();
  }

  /**
   * Mark execution as timed out
   */
  timeout(): void {
    this.status = ExecutionStatus.TIMEOUT;
    this.completedAt = new Date();
  }

  /**
   * Mark execution as abandoned (caller hung up)
   */
  abandon(): void {
    this.status = ExecutionStatus.ABANDONED;
    this.completedAt = new Date();
  }

  /**
   * Get execution duration in seconds
   */
  getDuration(): number {
    const endTime = this.completedAt || new Date();
    return Math.floor((endTime.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * Get execution summary
   */
  getSummary(): {
    flowId: string;
    status: ExecutionStatus;
    totalSteps: number;
    duration: number;
    success: boolean;
  } {
    return {
      flowId: this.flowId,
      status: this.status,
      totalSteps: this.steps.length,
      duration: this.getDuration(),
      success: this.status === ExecutionStatus.COMPLETED,
    };
  }

  /**
   * Check if execution is active
   */
  isActive(): boolean {
    return this.status === ExecutionStatus.RUNNING;
  }
}
