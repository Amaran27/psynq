/**
 * Campaign Domain Entity (Hexagonal Architecture)
 * 
 * Pure TypeScript - NO framework dependencies
 * Contains business logic and domain rules
 */

export enum CampaignType {
  PREVIEW = 'preview',
  PROGRESSIVE = 'progressive',
  PREDICTIVE = 'predictive',
  POWER = 'power',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DialMode {
  PREVIEW = 'preview',
  PROGRESSIVE = 'progressive',
  PREDICTIVE = 'predictive',
  POWER = 'power',
}

export interface CampaignSchedule {
  timezone: string;
  days: string[];
  startTime: string;
  endTime: string;
}

/**
 * Campaign Statistics (Value Object)
 */
export interface CampaignStats {
  totalLeads: number;
  contactedLeads: number;
  successfulCalls: number;
  failedAttempts: number;
  avgCallDurationSeconds: number;
}

/**
 * Domain Exception for Campaign business rule violations
 */
export class CampaignDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignDomainException';
  }
}

/**
 * Campaign Domain Entity
 * 
 * Rich domain model with business logic
 * Independent of infrastructure (database, framework)
 */
export class Campaign {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | undefined,
    public type: CampaignType,
    public status: CampaignStatus,
    public dialMode: DialMode,
    public organizationId: string | undefined,
    public startTime: Date | undefined,
    public endTime: Date | undefined,
    public schedule: CampaignSchedule | undefined,
    public maxAttempts: number,
    public retryIntervalMinutes: number,
    public abandonmentRate: number | undefined,
    public linesPerAgent: number | undefined,
    public leadListId: string | undefined,
    public stats: CampaignStats,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public startedAt: Date | undefined = undefined,
    public completedAt: Date | undefined = undefined,
  ) {}

  /**
   * Business Rule: Can only change dial mode when not active
   */
  canChangeDialMode(): boolean {
    return this.status !== CampaignStatus.ACTIVE;
  }

  /**
   * Business Rule: Update dial mode with validation
   */
  updateDialMode(newMode: DialMode): void {
    if (!this.canChangeDialMode()) {
      throw new CampaignDomainException(
        'Cannot change dial mode of active campaign',
      );
    }
    this.dialMode = newMode;
  }

  /**
   * Business Rule: Can only delete non-active campaigns
   */
  canBeDeleted(): boolean {
    return this.status !== CampaignStatus.ACTIVE;
  }

  /**
   * Business Rule: Validate deletion
   */
  validateDeletion(): void {
    if (!this.canBeDeleted()) {
      throw new CampaignDomainException(
        'Cannot delete active campaign. Pause it first.',
      );
    }
  }

  /**
   * Business Rule: Start campaign
   */
  start(): void {
    if (this.status === CampaignStatus.ACTIVE) {
      throw new CampaignDomainException('Campaign is already active');
    }
    if (this.status === CampaignStatus.COMPLETED) {
      throw new CampaignDomainException('Cannot restart completed campaign');
    }
    if (this.status === CampaignStatus.CANCELLED) {
      throw new CampaignDomainException('Cannot start cancelled campaign');
    }

    this.status = CampaignStatus.ACTIVE;
    this.startedAt = new Date();
  }

  /**
   * Business Rule: Pause campaign
   */
  pause(): void {
    if (this.status !== CampaignStatus.ACTIVE) {
      throw new CampaignDomainException('Can only pause active campaigns');
    }
    this.status = CampaignStatus.PAUSED;
  }

  /**
   * Business Rule: Resume campaign
   */
  resume(): void {
    if (this.status !== CampaignStatus.PAUSED) {
      throw new CampaignDomainException('Can only resume paused campaigns');
    }
    this.status = CampaignStatus.ACTIVE;
  }

  /**
   * Business Rule: Complete campaign
   */
  complete(): void {
    if (this.status !== CampaignStatus.ACTIVE && this.status !== CampaignStatus.PAUSED) {
      throw new CampaignDomainException('Can only complete active or paused campaigns');
    }
    this.status = CampaignStatus.COMPLETED;
    this.completedAt = new Date();
  }

  /**
   * Business Rule: Cancel campaign
   */
  cancel(): void {
    if (this.status === CampaignStatus.COMPLETED) {
      throw new CampaignDomainException('Cannot cancel completed campaign');
    }
    this.status = CampaignStatus.CANCELLED;
  }

  /**
   * Business Rule: Update statistics
   */
  updateStats(stats: Partial<CampaignStats>): void {
    this.stats = {
      ...this.stats,
      ...stats,
    };
  }

  /**
   * Business Rule: Increment contacted leads
   */
  incrementContactedLeads(): void {
    this.stats.contactedLeads++;
  }

  /**
   * Business Rule: Increment successful calls
   */
  incrementSuccessfulCalls(): void {
    this.stats.successfulCalls++;
  }

  /**
   * Business Rule: Increment failed attempts
   */
  incrementFailedAttempts(): void {
    this.stats.failedAttempts++;
  }

  /**
   * Validation: Check if campaign is valid
   */
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new CampaignDomainException('Campaign name is required');
    }

    if (this.maxAttempts < 1 || this.maxAttempts > 10) {
      throw new CampaignDomainException('Max attempts must be between 1 and 10');
    }

    if (this.retryIntervalMinutes < 1) {
      throw new CampaignDomainException('Retry interval must be at least 1 minute');
    }

    if (this.startTime && this.endTime && this.startTime >= this.endTime) {
      throw new CampaignDomainException('Start time must be before end time');
    }

    if (this.abandonmentRate !== undefined && (this.abandonmentRate < 0 || this.abandonmentRate > 1)) {
      throw new CampaignDomainException('Abandonment rate must be between 0 and 1');
    }

    if (this.linesPerAgent !== undefined && this.linesPerAgent < 1) {
      throw new CampaignDomainException('Lines per agent must be at least 1');
    }
  }
}
