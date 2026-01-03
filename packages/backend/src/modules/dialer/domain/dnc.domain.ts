/**
 * DNC (Do Not Call) List Domain Entity (Hexagonal Architecture)
 * 
 * Pure TypeScript - NO framework dependencies
 * Contains business logic and domain rules
 */

export enum DNCSource {
  MANUAL = 'manual',
  FEDERAL_REGISTRY = 'federal_registry',
  STATE_REGISTRY = 'state_registry',
  INTERNAL = 'internal',
  CUSTOMER_REQUEST = 'customer_request',
}

export enum DNCStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REMOVED = 'removed',
}

export interface DNCMetadata {
  reason: string | undefined;
  addedBy: string | undefined;
  requestDate: Date | undefined;
  expirationDate: Date | undefined;
}

/**
 * Domain Exception for DNC business rule violations
 */
export class DNCDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DNCDomainException';
  }
}

/**
 * DNCEntry Domain Entity
 * 
 * Represents a phone number on the Do Not Call list
 */
export class DNCEntry {
  constructor(
    public readonly id: string,
    public phoneNumber: string,
    public source: DNCSource,
    public status: DNCStatus,
    public organizationId: string | undefined,
    public metadata: DNCMetadata,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public expiresAt: Date | undefined = undefined,
  ) {}

  /**
   * Business Rule: Check if entry is active
   */
  isActive(): boolean {
    if (this.status !== DNCStatus.ACTIVE) return false;
    if (this.expiresAt && this.expiresAt < new Date()) {
      this.status = DNCStatus.EXPIRED;
      return false;
    }
    return true;
  }

  /**
   * Business Rule: Remove from DNC
   */
  remove(reason: string): void {
    if (this.source === DNCSource.FEDERAL_REGISTRY || this.source === DNCSource.STATE_REGISTRY) {
      throw new DNCDomainException('Cannot remove federally/state registered DNC entries');
    }
    
    this.status = DNCStatus.REMOVED;
    this.metadata.reason = reason;
  }

  /**
   * Business Rule: Extend expiration
   */
  extend(expirationDate: Date): void {
    if (this.status !== DNCStatus.ACTIVE) {
      throw new DNCDomainException('Can only extend active DNC entries');
    }
    if (expirationDate <= new Date()) {
      throw new DNCDomainException('Expiration date must be in the future');
    }
    
    this.expiresAt = expirationDate;
    this.metadata.expirationDate = expirationDate;
  }

  /**
   * Business Rule: Normalize phone number
   */
  static normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let normalized = phoneNumber.replace(/\D/g, '');
    
    // Add + prefix if not present for E.164 format
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    
    return normalized;
  }

  /**
   * Validation: Check if entry is valid
   */
  validate(): void {
    if (!this.phoneNumber || this.phoneNumber.trim().length === 0) {
      throw new DNCDomainException('Phone number is required');
    }

    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(this.phoneNumber)) {
      throw new DNCDomainException('Invalid phone number format');
    }

    if (this.expiresAt && this.expiresAt <= this.createdAt) {
      throw new DNCDomainException('Expiration date must be after creation date');
    }
  }
}

/**
 * CallingHours Domain Value Object
 * 
 * Represents allowed calling hours for compliance
 */
export class CallingHours {
  constructor(
    public timezone: string,
    public startHour: number, // 0-23
    public endHour: number, // 0-23
    public allowedDays: number[], // 0-6 (Sunday-Saturday)
  ) {
    this.validate();
  }

  /**
   * Business Rule: Check if current time is within calling hours
   */
  isWithinCallingHours(date: Date = new Date()): boolean {
    const hour = date.getHours();
    const day = date.getDay();
    
    // Check if day is allowed
    if (!this.allowedDays.includes(day)) return false;
    
    // Check if hour is within range
    if (hour < this.startHour || hour >= this.endHour) return false;
    
    return true;
  }

  /**
   * Get next available calling time
   */
  getNextAvailableTime(from: Date = new Date()): Date {
    const next = new Date(from);
    
    // Find next available day
    while (!this.allowedDays.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
      next.setHours(this.startHour, 0, 0, 0);
    }
    
    // Set to start hour if before
    if (next.getHours() < this.startHour) {
      next.setHours(this.startHour, 0, 0, 0);
    }
    
    // Move to next day if after end hour
    if (next.getHours() >= this.endHour) {
      next.setDate(next.getDate() + 1);
      next.setHours(this.startHour, 0, 0, 0);
      return this.getNextAvailableTime(next);
    }
    
    return next;
  }

  /**
   * Validation
   */
  validate(): void {
    if (this.startHour < 0 || this.startHour > 23) {
      throw new DNCDomainException('Start hour must be between 0 and 23');
    }
    
    if (this.endHour < 0 || this.endHour > 23) {
      throw new DNCDomainException('End hour must be between 0 and 23');
    }
    
    if (this.startHour >= this.endHour) {
      throw new DNCDomainException('Start hour must be before end hour');
    }
    
    if (this.allowedDays.length === 0) {
      throw new DNCDomainException('At least one allowed day is required');
    }
    
    if (this.allowedDays.some(d => d < 0 || d > 6)) {
      throw new DNCDomainException('Allowed days must be between 0 and 6');
    }
  }
}
