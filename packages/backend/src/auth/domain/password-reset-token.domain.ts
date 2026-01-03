/**
 * Password Reset Token Domain Model
 *
 * Pure TypeScript - NO framework imports (no TypeORM, no NestJS)
 * This is the heart of the domain for password reset functionality.
 *
 * Business Rules:
 * - Tokens expire after 1 hour
 * - Tokens can only be used once
 * - Tokens must be cryptographically random
 */

export class PasswordResetToken {
  private readonly _expiryDurationMs = 3600000; // 1 hour

  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
    public usedAt: Date | null = null,
  ) {}

  /**
   * Domain Logic: Check if token is valid for use
   * Business rule: Token must not be expired and must not be already used
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isUsed();
  }

  /**
   * Domain Logic: Check if token has expired
   * Business rule: Token expires after 1 hour
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Domain Logic: Check if token has been used
   * Business rule: Tokens can only be used once
   */
  isUsed(): boolean {
    return this.usedAt !== null;
  }

  /**
   * Domain Logic: Mark token as used
   * Business rule: Can only mark unused tokens as used
   * Returns success/failure
   */
  markAsUsed(): boolean {
    if (this.isUsed()) {
      return false;
    }
    this.usedAt = new Date();
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
   * Factory: Create new password reset token
   * Generates cryptographically random token and sets expiry
   */
  static create(userId: string, id: string): PasswordResetToken {
    const crypto = require('crypto');
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600000); // 1 hour from now

    return new PasswordResetToken(
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
    usedAt: Date | null;
  }): PasswordResetToken {
    return new PasswordResetToken(
      data.id,
      data.userId,
      data.token,
      data.expiresAt,
      data.createdAt,
      data.usedAt,
    );
  }
}
