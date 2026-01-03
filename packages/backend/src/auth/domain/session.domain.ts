/**
 * Session Domain Model
 *
 * Pure TypeScript - NO framework imports (no TypeORM, no NestJS)
 * This is the heart of the domain for user session management.
 *
 * Business Rules:
 * - Sessions expire after refresh token expiry time
 * - Sessions can be revoked (user logout or admin action)
 * - Track session metadata for security auditing
 */

export class Session {
  private readonly _refreshTokenExpiryMs = 604800000; // 7 days

  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly refreshToken: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
    public revokedAt: Date | null = null,
  ) {}

  /**
   * Domain Logic: Check if session is valid
   * Business rule: Session must not be expired and must not be revoked
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }

  /**
   * Domain Logic: Check if session has expired
   * Business rule: Session expires after 7 days
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Domain Logic: Check if session has been revoked
   * Business rule: Revoked sessions are invalid
   */
  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  /**
   * Domain Logic: Revoke session
   * Business rule: Can only revoke active sessions
   * Returns success/failure
   */
  revoke(): boolean {
    if (this.isRevoked()) {
      return false;
    }
    this.revokedAt = new Date();
    return true;
  }

  /**
   * Domain Logic: Get remaining time until expiry
   * Returns 0 if already expired
   */
  getRemainingTime(): number {
    const remaining = this.expiresAt.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Domain Logic: Check if session needs refresh
   * Business rule: Refresh when less than 1 day remaining
   */
  needsRefresh(): boolean {
    const oneDayMs = 86400000;
    return this.getRemainingTime() < oneDayMs;
  }

  /**
   * Factory: Create new session
   * Generates refresh token and sets expiry
   */
  static create(
    userId: string,
    refreshToken: string,
    userAgent: string | null,
    ipAddress: string | null,
    id: string,
  ): Session {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 604800000); // 7 days from now

    return new Session(
      id,
      userId,
      refreshToken,
      expiresAt,
      now,
      userAgent,
      ipAddress,
      null,
    );
  }

  /**
   * Factory: Reconstitute from persistence
   * Used by adapters when loading from database
   */
  static fromPersistence(data: {
    id: string;
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
    revokedAt: Date | null;
  }): Session {
    return new Session(
      data.id,
      data.userId,
      data.refreshToken,
      data.expiresAt,
      data.createdAt,
      data.userAgent,
      data.ipAddress,
      data.revokedAt,
    );
  }
}
