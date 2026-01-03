/**
 * Lead Domain Entity (Hexagonal Architecture)
 * 
 * Pure TypeScript - NO framework dependencies
 * Contains business logic and domain rules
 */

export enum LeadStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  DIALING = 'dialing',
  CONTACTED = 'contacted',
  NOT_INTERESTED = 'not_interested',
  CALLBACK_REQUESTED = 'callback_requested',
  CONVERTED = 'converted',
  DNC = 'dnc',
  FAILED = 'failed',
}

export enum LeadCallOutcome {
  NO_ANSWER = 'no_answer',
  BUSY = 'busy',
  ANSWERED = 'answered',
  VOICEMAIL = 'voicemail',
  WRONG_NUMBER = 'wrong_number',
  DISCONNECTED = 'disconnected',
}

export interface LeadCustomData {
  [key: string]: any;
}

export interface DialAttempt {
  attemptNumber: number;
  timestamp: Date;
  agentId: string | undefined;
  outcome: LeadCallOutcome | undefined;
  callDurationSeconds: number | undefined;
  notes: string | undefined;
}

/**
 * Domain Exception for Lead business rule violations
 */
export class LeadDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadDomainException';
  }
}

/**
 * Lead Domain Entity
 * 
 * Rich domain model with business logic
 * Independent of infrastructure (database, framework)
 */
export class Lead {
  constructor(
    public readonly id: string,
    public campaignId: string,
    public phoneNumber: string,
    public firstName: string | undefined,
    public lastName: string | undefined,
    public email: string | undefined,
    public status: LeadStatus,
    public priority: number,
    public timezone: string | undefined,
    public customData: LeadCustomData,
    public attempts: DialAttempt[],
    public assignedAgentId: string | undefined,
    public lastAttemptAt: Date | undefined,
    public nextAttemptAt: Date | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public contactedAt: Date | undefined = undefined,
    public convertedAt: Date | undefined = undefined,
  ) {}

  /**
   * Business Rule: Check if lead is dialable
   */
  isDialable(maxAttempts: number): boolean {
    if (this.status === LeadStatus.DNC) return false;
    if (this.status === LeadStatus.CONVERTED) return false;
    if (this.status === LeadStatus.NOT_INTERESTED) return false;
    if (this.attempts.length >= maxAttempts) return false;
    if (this.nextAttemptAt && this.nextAttemptAt > new Date()) return false;
    
    return true;
  }

  /**
   * Business Rule: Assign lead to agent
   */
  assign(agentId: string): void {
    if (this.status === LeadStatus.DNC) {
      throw new LeadDomainException('Cannot assign DNC lead');
    }
    if (this.status === LeadStatus.CONVERTED) {
      throw new LeadDomainException('Cannot assign converted lead');
    }
    
    this.assignedAgentId = agentId;
    this.status = LeadStatus.ASSIGNED;
  }

  /**
   * Business Rule: Mark lead as dialing
   */
  markDialing(): void {
    if (!this.assignedAgentId) {
      throw new LeadDomainException('Cannot mark unassigned lead as dialing');
    }
    this.status = LeadStatus.DIALING;
  }

  /**
   * Business Rule: Record dial attempt
   */
  recordAttempt(
    outcome: LeadCallOutcome,
    callDurationSeconds: number | undefined = undefined,
    notes: string | undefined = undefined,
  ): void {
    const attempt: DialAttempt = {
      attemptNumber: this.attempts.length + 1,
      timestamp: new Date(),
      agentId: this.assignedAgentId,
      outcome,
      callDurationSeconds,
      notes,
    };

    this.attempts.push(attempt);
    this.lastAttemptAt = attempt.timestamp;

    // Update status based on outcome
    if (outcome === LeadCallOutcome.ANSWERED) {
      this.status = LeadStatus.CONTACTED;
      this.contactedAt = new Date();
    } else if (outcome === LeadCallOutcome.WRONG_NUMBER || outcome === LeadCallOutcome.DISCONNECTED) {
      this.status = LeadStatus.FAILED;
    } else {
      this.status = LeadStatus.NEW; // Ready for retry
    }
  }

  /**
   * Business Rule: Calculate next attempt time
   */
  scheduleNextAttempt(retryIntervalMinutes: number): void {
    if (this.status === LeadStatus.DNC || this.status === LeadStatus.CONVERTED) {
      return; // No retry needed
    }

    const nextAttempt = new Date();
    nextAttempt.setMinutes(nextAttempt.getMinutes() + retryIntervalMinutes);
    this.nextAttemptAt = nextAttempt;
  }

  /**
   * Business Rule: Mark as not interested
   */
  markNotInterested(): void {
    this.status = LeadStatus.NOT_INTERESTED;
  }

  /**
   * Business Rule: Request callback
   */
  requestCallback(callbackTime: Date): void {
    this.status = LeadStatus.CALLBACK_REQUESTED;
    this.nextAttemptAt = callbackTime;
  }

  /**
   * Business Rule: Convert lead
   */
  convert(): void {
    if (this.status !== LeadStatus.CONTACTED) {
      throw new LeadDomainException('Can only convert contacted leads');
    }
    this.status = LeadStatus.CONVERTED;
    this.convertedAt = new Date();
  }

  /**
   * Business Rule: Add to DNC
   */
  addToDNC(): void {
    this.status = LeadStatus.DNC;
  }

  /**
   * Business Rule: Update priority
   */
  setPriority(priority: number): void {
    if (priority < 1 || priority > 10) {
      throw new LeadDomainException('Priority must be between 1 and 10');
    }
    this.priority = priority;
  }

  /**
   * Business Rule: Check if calling hours are valid
   */
  isWithinCallingHours(startHour: number, endHour: number): boolean {
    if (!this.timezone) return true; // No timezone restriction

    const now = new Date();
    const currentHour = now.getHours();
    
    return currentHour >= startHour && currentHour < endHour;
  }

  /**
   * Validation: Check if lead is valid
   */
  validate(): void {
    if (!this.phoneNumber || this.phoneNumber.trim().length === 0) {
      throw new LeadDomainException('Phone number is required');
    }

    // Basic phone number validation (E.164 format: +1234567890)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(this.phoneNumber)) {
      throw new LeadDomainException('Invalid phone number format');
    }

    if (this.priority < 1 || this.priority > 10) {
      throw new LeadDomainException('Priority must be between 1 and 10');
    }

    if (this.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        throw new LeadDomainException('Invalid email format');
      }
    }
  }

  /**
   * Get full name
   */
  getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    if (this.firstName) return this.firstName;
    if (this.lastName) return this.lastName;
    return this.phoneNumber;
  }

  /**
   * Get attempt count
   */
  getAttemptCount(): number {
    return this.attempts.length;
  }

  /**
   * Get successful contact attempts
   */
  getSuccessfulAttempts(): DialAttempt[] {
    return this.attempts.filter(a => a.outcome === LeadCallOutcome.ANSWERED);
  }
}
