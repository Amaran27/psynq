/**
 * Rate Plan Domain Model
 * Pure TypeScript business logic for pricing plans
 */

export enum RatePlanType {
  PREPAID = 'prepaid',
  POSTPAID = 'postpaid',
  HYBRID = 'hybrid',
}

export enum RatePlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum ChargeType {
  PER_MINUTE = 'per_minute',
  PER_SECOND = 'per_second',
  PER_CALL = 'per_call',
  PER_SMS = 'per_sms',
  FLAT_RATE = 'flat_rate',
}

export enum RoundingMethod {
  CEIL = 'ceil',
  FLOOR = 'floor',
  ROUND = 'round',
}

export class RatePlan {
  constructor(
    public readonly id: string,
    public organizationId: string,
    public name: string,
    public type: RatePlanType,
    public status: RatePlanStatus,
    public description?: string,
    public chargeType: ChargeType = ChargeType.PER_MINUTE,
    public baseRate: number = 0,
    public minimumCharge: number = 0,
    public roundingMethod: RoundingMethod = RoundingMethod.CEIL,
    public roundingIncrement: number = 1,
    public freeSeconds: number = 0,
    public currency: string = 'USD',
    public billingCycle: number = 30,
    public gracePeriodDays: number = 7,
    public lowBalanceThreshold: number = 10,
    public autoRecharge: boolean = false,
    public autoRechargeAmount?: number,
    public autoRechargeThreshold?: number,
    public effectiveFrom?: Date,
    public effectiveTo?: Date,
    public metadata?: Record<string, any>,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  /**
   * Validates the rate plan
   */
  validate(): void {
    const errors: string[] = [];

    if (!this.organizationId || this.organizationId.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Rate plan name is required');
    }

    if (this.name && this.name.length > 255) {
      errors.push('Rate plan name must not exceed 255 characters');
    }

    if (this.baseRate < 0) {
      errors.push('Base rate cannot be negative');
    }

    if (this.minimumCharge < 0) {
      errors.push('Minimum charge cannot be negative');
    }

    if (this.roundingIncrement <= 0) {
      errors.push('Rounding increment must be greater than 0');
    }

    if (this.freeSeconds < 0) {
      errors.push('Free seconds cannot be negative');
    }

    if (this.billingCycle <= 0) {
      errors.push('Billing cycle must be greater than 0');
    }

    if (this.gracePeriodDays < 0) {
      errors.push('Grace period days cannot be negative');
    }

    if (this.lowBalanceThreshold < 0) {
      errors.push('Low balance threshold cannot be negative');
    }

    if (this.autoRecharge) {
      if (!this.autoRechargeAmount || this.autoRechargeAmount <= 0) {
        errors.push('Auto recharge amount must be greater than 0 when auto recharge is enabled');
      }
      if (!this.autoRechargeThreshold || this.autoRechargeThreshold < 0) {
        errors.push('Auto recharge threshold must be non-negative when auto recharge is enabled');
      }
    }

    if (this.effectiveFrom && this.effectiveTo) {
      if (this.effectiveFrom >= this.effectiveTo) {
        errors.push('Effective from date must be before effective to date');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Rate Plan validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Activates the rate plan
   */
  activate(): void {
    if (this.status === RatePlanStatus.ACTIVE) {
      throw new Error('Rate plan is already active');
    }
    this.status = RatePlanStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Suspends the rate plan
   */
  suspend(): void {
    if (this.status === RatePlanStatus.SUSPENDED) {
      throw new Error('Rate plan is already suspended');
    }
    this.status = RatePlanStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  /**
   * Archives the rate plan
   */
  archive(): void {
    if (this.status === RatePlanStatus.ARCHIVED) {
      throw new Error('Rate plan is already archived');
    }
    this.status = RatePlanStatus.ARCHIVED;
    this.updatedAt = new Date();
  }

  /**
   * Checks if the rate plan is active
   */
  isActive(): boolean {
    if (this.status !== RatePlanStatus.ACTIVE) {
      return false;
    }

    const now = new Date();
    if (this.effectiveFrom && now < this.effectiveFrom) {
      return false;
    }
    if (this.effectiveTo && now > this.effectiveTo) {
      return false;
    }

    return true;
  }

  /**
   * Calculates the charge for given duration in seconds
   */
  calculateCharge(durationSeconds: number): number {
    if (durationSeconds <= 0) {
      return 0;
    }

    // Apply free seconds
    const chargeableSeconds = Math.max(0, durationSeconds - this.freeSeconds);
    if (chargeableSeconds === 0) {
      return 0;
    }

    let charge = 0;

    switch (this.chargeType) {
      case ChargeType.PER_MINUTE:
        const minutes = this.applyRounding(chargeableSeconds / 60);
        charge = minutes * this.baseRate;
        break;

      case ChargeType.PER_SECOND:
        charge = chargeableSeconds * this.baseRate;
        break;

      case ChargeType.PER_CALL:
        charge = this.baseRate;
        break;

      case ChargeType.FLAT_RATE:
        charge = this.baseRate;
        break;

      default:
        throw new Error(`Unsupported charge type: ${this.chargeType}`);
    }

    // Apply minimum charge
    charge = Math.max(charge, this.minimumCharge);

    // Round to 2 decimal places
    return Math.round(charge * 100) / 100;
  }

  /**
   * Applies rounding method to a value
   */
  private applyRounding(value: number): number {
    const increment = this.roundingIncrement;

    switch (this.roundingMethod) {
      case RoundingMethod.CEIL:
        return Math.ceil(value / increment) * increment;

      case RoundingMethod.FLOOR:
        return Math.floor(value / increment) * increment;

      case RoundingMethod.ROUND:
        return Math.round(value / increment) * increment;

      default:
        return value;
    }
  }

  /**
   * Updates rate plan settings
   */
  updateSettings(
    name?: string,
    description?: string,
    baseRate?: number,
    minimumCharge?: number,
    freeSeconds?: number,
  ): void {
    if (name !== undefined) this.name = name;
    if (description !== undefined) this.description = description;
    if (baseRate !== undefined) this.baseRate = baseRate;
    if (minimumCharge !== undefined) this.minimumCharge = minimumCharge;
    if (freeSeconds !== undefined) this.freeSeconds = freeSeconds;
    this.updatedAt = new Date();
  }

  /**
   * Converts domain to plain JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      type: this.type,
      status: this.status,
      description: this.description,
      chargeType: this.chargeType,
      baseRate: this.baseRate,
      minimumCharge: this.minimumCharge,
      roundingMethod: this.roundingMethod,
      roundingIncrement: this.roundingIncrement,
      freeSeconds: this.freeSeconds,
      currency: this.currency,
      billingCycle: this.billingCycle,
      gracePeriodDays: this.gracePeriodDays,
      lowBalanceThreshold: this.lowBalanceThreshold,
      autoRecharge: this.autoRecharge,
      autoRechargeAmount: this.autoRechargeAmount,
      autoRechargeThreshold: this.autoRechargeThreshold,
      effectiveFrom: this.effectiveFrom,
      effectiveTo: this.effectiveTo,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
