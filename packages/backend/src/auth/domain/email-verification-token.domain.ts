/**
 * Email Verification Token Domain Model
 *
 * Pure TypeScript - NO framework imports (no TypeORM, no NestJS)
 * This is the heart of the domain for email verification functionality.
 *
 * Business Rules:
 * - Tokens expire after 24 hours
 * - Tokens can only be used once
 * - Tokens must be cryptographically random
 */

export class EmailVerificationToken {
  private readonly _expiryDurationMs = 86400000; // 24 hours

  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
    public verifiedAt: Date | null = null,
  ) {}

  /**
   * Domain Logic: Check if token is valid for use
   * Business rule: Token must not be expired and must not be already verified
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isVerified();
  }

  /**
   * Domain Logic: Check if token has expired
   * Business rule: Token expires after 24 hours
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Domain Logic: Check if email has been verified
   * Business rule: Tokens can only be verified once
   */
  isVerified(): boolean {
    return this.verifiedAt !== null;
  }

  /**
   * Domain Logic: Mark email as verified
   * Business rule: Can only mark unverified tokens as verified
   * Returns success/failure
   */
  markAsVerified(): boolean {
    if (this.isVerified()) {
      return false;
    }
    this.verifiedAt = new Date();
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
   * Factory: Create new email verification token
   * Generates cryptographically random token and sets expiry
   */
  static create(userId: string, id: string): EmailVerificationToken {
    const crypto = require('crypto');
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 86400000); // 24 hours from now

    return new EmailVerificationToken(
      id,
      userId,
      token,
      expiresAt,
      now,
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
    token: string;
    expiresAt: Date;
    createdAt: Date;
    verifiedAt: Date | null;
  }): EmailVerificationToken {
    return new EmailVerificationToken(
      data.id,
      data.userId,
      data.token,
      data.expiresAt,
      data.createdAt,
      data.verifiedAt,
    );
  }
}
