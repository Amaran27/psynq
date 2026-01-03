/**
 * Failed Login Attempt Domain Model
 *
 * Pure TypeScript - NO framework imports (no TypeORM, no NestJS)
 * This is the heart of the domain for tracking failed login attempts.
 *
 * Business Rules:
 * - Track failed attempts for security auditing
 * - Support account lockout after too many attempts
 * - Track metadata for fraud detection
 */

export enum FailureReason {
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  ACCOUNT_LOCKED = 'account_locked',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
  ACCOUNT_DISABLED = 'account_disabled',
}

export class FailedLoginAttempt {
  constructor(
    public readonly id: string,
    public readonly userId: string | null, // null if user not found
    public readonly username: string,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly reason: FailureReason,
    public readonly timestamp: Date,
  ) {}

  /**
   * Domain Logic: Check if this is a recent attempt
   * Business rule: Recent = within 15 minutes
   */
  isRecent(): boolean {
    const fifteenMinutesMs = 900000;
    const timeSinceAttempt = Date.now() - this.timestamp.getTime();
    return timeSinceAttempt < fifteenMinutesMs;
  }

  /**
   * Domain Logic: Check if this is a suspicious pattern
   * Business rule: Multiple recent failures from same IP indicate attack
   */
  isSuspicious(recentAttempts: FailedLoginAttempt[]): boolean {
    const attemptsFromSameIP = recentAttempts.filter(
      attempt => attempt.ipAddress === this.ipAddress && attempt.isRecent()
    );
    return attemptsFromSameIP.length >= 5;
  }

  /**
   * Factory: Create failed login attempt record
   */
  static create(
    userId: string | null,
    username: string,
    ipAddress: string | null,
    userAgent: string | null,
    reason: FailureReason,
    id: string,
  ): FailedLoginAttempt {
    return new FailedLoginAttempt(
      id,
      userId,
      username,
      ipAddress,
      userAgent,
      reason,
      new Date(),
    );
  }

  /**
   * Factory: Reconstitute from persistence
   * Used by adapters when loading from database
   */
  static fromPersistence(data: {
    id: string;
    userId: string | null;
    username: string;
    ipAddress: string | null;
    userAgent: string | null;
    reason: FailureReason;
    timestamp: Date;
  }): FailedLoginAttempt {
    return new FailedLoginAttempt(
      data.id,
      data.userId,
      data.username,
      data.ipAddress,
      data.userAgent,
      data.reason,
      data.timestamp,
    );
  }
}
