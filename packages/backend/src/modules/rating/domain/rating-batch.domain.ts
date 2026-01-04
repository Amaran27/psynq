/**
 * Rating Batch Domain Model
 * Pure TypeScript business logic for batch rating jobs
 */

export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

export class RatingBatch {
  constructor(
    public readonly id: string,
    public organizationId: string,
    public status: BatchStatus = BatchStatus.PENDING,
    public startedAt?: Date,
    public completedAt?: Date,
    public totalRecords: number = 0,
    public processedRecords: number = 0,
    public successfulRecords: number = 0,
    public failedRecords: number = 0,
    public totalAmount: number = 0,
    public currency: string = 'USD',
    public errorMessage?: string,
    public metadata?: Record<string, any>,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  /**
   * Validates the rating batch
   */
  validate(): void {
    const errors: string[] = [];

    if (!this.organizationId || this.organizationId.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (this.totalRecords < 0) {
      errors.push('Total records cannot be negative');
    }

    if (this.processedRecords < 0) {
      errors.push('Processed records cannot be negative');
    }

    if (this.successfulRecords < 0) {
      errors.push('Successful records cannot be negative');
    }

    if (this.failedRecords < 0) {
      errors.push('Failed records cannot be negative');
    }

    if (this.totalAmount < 0) {
      errors.push('Total amount cannot be negative');
    }

    if (this.processedRecords > this.totalRecords) {
      errors.push('Processed records cannot exceed total records');
    }

    if (errors.length > 0) {
      throw new Error(`Rating Batch validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Starts the batch processing
   */
  start(totalRecords: number): void {
    if (this.status !== BatchStatus.PENDING) {
      throw new Error('Can only start a pending batch');
    }

    if (totalRecords <= 0) {
      throw new Error('Total records must be greater than 0');
    }

    this.status = BatchStatus.PROCESSING;
    this.totalRecords = totalRecords;
    this.startedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Records a successful rating
   */
  recordSuccess(amount: number): void {
    if (this.status !== BatchStatus.PROCESSING) {
      throw new Error('Can only record success for processing batch');
    }

    this.processedRecords++;
    this.successfulRecords++;
    this.totalAmount += amount;
    this.updatedAt = new Date();
  }

  /**
   * Records a failed rating
   */
  recordFailure(errorMessage?: string): void {
    if (this.status !== BatchStatus.PROCESSING) {
      throw new Error('Can only record failure for processing batch');
    }

    this.processedRecords++;
    this.failedRecords++;
    if (errorMessage && !this.errorMessage) {
      this.errorMessage = errorMessage;
    }
    this.updatedAt = new Date();
  }

  /**
   * Completes the batch processing
   */
  complete(): void {
    if (this.status !== BatchStatus.PROCESSING) {
      throw new Error('Can only complete a processing batch');
    }

    if (this.processedRecords !== this.totalRecords) {
      throw new Error('Cannot complete batch with unprocessed records');
    }

    if (this.failedRecords === 0) {
      this.status = BatchStatus.COMPLETED;
    } else if (this.successfulRecords === 0) {
      this.status = BatchStatus.FAILED;
    } else {
      this.status = BatchStatus.PARTIAL;
    }

    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Marks the batch as failed
   */
  fail(errorMessage: string): void {
    if (this.status === BatchStatus.COMPLETED) {
      throw new Error('Cannot fail a completed batch');
    }

    this.status = BatchStatus.FAILED;
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Gets processing progress percentage
   */
  getProgressPercentage(): number {
    if (this.totalRecords === 0) {
      return 0;
    }
    return Math.round((this.processedRecords / this.totalRecords) * 100);
  }

  /**
   * Gets success rate percentage
   */
  getSuccessRate(): number {
    if (this.processedRecords === 0) {
      return 0;
    }
    return Math.round((this.successfulRecords / this.processedRecords) * 100);
  }

  /**
   * Gets processing duration in seconds
   */
  getProcessingDuration(): number {
    if (!this.startedAt) {
      return 0;
    }

    const endTime = this.completedAt || new Date();
    return Math.floor((endTime.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * Checks if the batch is complete
   */
  isComplete(): boolean {
    return this.status === BatchStatus.COMPLETED || this.status === BatchStatus.PARTIAL;
  }

  /**
   * Checks if the batch is processing
   */
  isProcessing(): boolean {
    return this.status === BatchStatus.PROCESSING;
  }

  /**
   * Gets batch statistics
   */
  getStatistics(): {
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
    totalAmount: number;
    successRate: number;
    progressPercentage: number;
    durationSeconds: number;
  } {
    return {
      totalRecords: this.totalRecords,
      processedRecords: this.processedRecords,
      successfulRecords: this.successfulRecords,
      failedRecords: this.failedRecords,
      totalAmount: this.totalAmount,
      successRate: this.getSuccessRate(),
      progressPercentage: this.getProgressPercentage(),
      durationSeconds: this.getProcessingDuration(),
    };
  }

  /**
   * Converts domain to plain JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      totalRecords: this.totalRecords,
      processedRecords: this.processedRecords,
      successfulRecords: this.successfulRecords,
      failedRecords: this.failedRecords,
      totalAmount: this.totalAmount,
      currency: this.currency,
      errorMessage: this.errorMessage,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
