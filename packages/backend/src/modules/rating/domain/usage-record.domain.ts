/**
 * Usage Record Domain Model
 * Pure TypeScript business logic for usage tracking and rating
 */

export enum UsageType {
  VOICE_INBOUND = 'voice_inbound',
  VOICE_OUTBOUND = 'voice_outbound',
  SMS_INBOUND = 'sms_inbound',
  SMS_OUTBOUND = 'sms_outbound',
  DATA_TRANSFER = 'data_transfer',
  API_CALL = 'api_call',
}

export enum RatingStatus {
  PENDING = 'pending',
  RATED = 'rated',
  FAILED = 'failed',
  DISPUTED = 'disputed',
}

export class UsageRecord {
  constructor(
    public readonly id: string,
    public organizationId: string,
    public customerId: string,
    public ratePlanId: string,
    public walletId?: string,
    public usageType: UsageType = UsageType.VOICE_OUTBOUND,
    public startTime: Date = new Date(),
    public endTime?: Date,
    public durationSeconds: number = 0,
    public quantity: number = 1,
    public unitCost: number = 0,
    public totalCost: number = 0,
    public currency: string = 'USD',
    public ratingStatus: RatingStatus = RatingStatus.PENDING,
    public ratedAt?: Date,
    public sourceNumber?: string,
    public destinationNumber?: string,
    public callId?: string,
    public campaignId?: string,
    public ratingBatchId?: string,
    public failureReason?: string,
    public metadata?: Record<string, any>,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  /**
   * Validates the usage record
   */
  validate(): void {
    const errors: string[] = [];

    if (!this.organizationId || this.organizationId.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (!this.customerId || this.customerId.trim().length === 0) {
      errors.push('Customer ID is required');
    }

    if (!this.ratePlanId || this.ratePlanId.trim().length === 0) {
      errors.push('Rate plan ID is required');
    }

    if (this.durationSeconds < 0) {
      errors.push('Duration cannot be negative');
    }

    if (this.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (this.unitCost < 0) {
      errors.push('Unit cost cannot be negative');
    }

    if (this.totalCost < 0) {
      errors.push('Total cost cannot be negative');
    }

    if (this.endTime && this.startTime >= this.endTime) {
      errors.push('Start time must be before end time');
    }

    if (errors.length > 0) {
      throw new Error(`Usage Record validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Marks the record as rated with calculated cost
   */
  markAsRated(unitCost: number, totalCost: number, ratingBatchId?: string): void {
    if (this.ratingStatus === RatingStatus.RATED) {
      throw new Error('Usage record is already rated');
    }

    if (unitCost < 0 || totalCost < 0) {
      throw new Error('Costs cannot be negative');
    }

    this.unitCost = unitCost;
    this.totalCost = totalCost;
    this.ratingStatus = RatingStatus.RATED;
    this.ratedAt = new Date();
    if (ratingBatchId) {
      this.ratingBatchId = ratingBatchId;
    }
    this.updatedAt = new Date();
  }

  /**
   * Marks the record as failed with reason
   */
  markAsFailed(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Failure reason is required');
    }

    this.ratingStatus = RatingStatus.FAILED;
    this.failureReason = reason;
    this.updatedAt = new Date();
  }

  /**
   * Marks the record as disputed
   */
  markAsDisputed(reason?: string): void {
    if (this.ratingStatus !== RatingStatus.RATED) {
      throw new Error('Can only dispute rated records');
    }

    this.ratingStatus = RatingStatus.DISPUTED;
    if (reason) {
      this.failureReason = reason;
    }
    this.updatedAt = new Date();
  }

  /**
   * Calculates duration in seconds from start and end time
   */
  calculateDuration(): number {
    if (!this.endTime) {
      return 0;
    }

    const duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
    this.durationSeconds = Math.max(0, duration);
    return this.durationSeconds;
  }

  /**
   * Ends the usage session
   */
  endSession(endTime: Date): void {
    if (this.endTime) {
      throw new Error('Session already ended');
    }

    if (endTime <= this.startTime) {
      throw new Error('End time must be after start time');
    }

    this.endTime = endTime;
    this.calculateDuration();
    this.updatedAt = new Date();
  }

  /**
   * Checks if the record is pending rating
   */
  isPending(): boolean {
    return this.ratingStatus === RatingStatus.PENDING;
  }

  /**
   * Checks if the record is rated
   */
  isRated(): boolean {
    return this.ratingStatus === RatingStatus.RATED;
  }

  /**
   * Checks if the record failed rating
   */
  isFailed(): boolean {
    return this.ratingStatus === RatingStatus.FAILED;
  }

  /**
   * Gets usage summary
   */
  getSummary(): {
    type: UsageType;
    duration: number;
    cost: number;
    currency: string;
    status: RatingStatus;
  } {
    return {
      type: this.usageType,
      duration: this.durationSeconds,
      cost: this.totalCost,
      currency: this.currency,
      status: this.ratingStatus,
    };
  }

  /**
   * Converts domain to plain JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      customerId: this.customerId,
      ratePlanId: this.ratePlanId,
      walletId: this.walletId,
      usageType: this.usageType,
      startTime: this.startTime,
      endTime: this.endTime,
      durationSeconds: this.durationSeconds,
      quantity: this.quantity,
      unitCost: this.unitCost,
      totalCost: this.totalCost,
      currency: this.currency,
      ratingStatus: this.ratingStatus,
      ratedAt: this.ratedAt,
      sourceNumber: this.sourceNumber,
      destinationNumber: this.destinationNumber,
      callId: this.callId,
      campaignId: this.campaignId,
      ratingBatchId: this.ratingBatchId,
      failureReason: this.failureReason,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
