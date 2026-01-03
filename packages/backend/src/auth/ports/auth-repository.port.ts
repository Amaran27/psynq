/**
 * Auth Repository Port (Interface)
 *
 * This is a PORT in hexagonal architecture.
 * Defines the contract for auth data operations without implementation details.
 *
 * Rules:
 * - Interface only (no implementation)
 * - No framework imports
 * - Uses domain types
 */

import {
  AuthUser,
  AuthCredentials,
  UserRole,
} from '../domain/authentication.entity';
import { PasswordResetToken } from '../domain/password-reset-token.domain';
import { EmailVerificationToken } from '../domain/email-verification-token.domain';
import { Session } from '../domain/session.domain';
import { FailedLoginAttempt } from '../domain/failed-login-attempt.domain';

export interface IAuthRepository {
  /**
   * Find user by username
   */
  findByUsername(
    username: string,
  ): Promise<(AuthUser & { password: string }) | null>;

  /**
   * Find user by ID
   */
  findById(id: string): Promise<AuthUser | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<(AuthUser & { password: string }) | null>;

  /**
   * Create a new user
   */
  create(
    credentials: AuthCredentials,
    hashedPassword: string,
    role?: UserRole,
  ): Promise<AuthUser>;

  /**
   * Update user status
   */
  updateStatus(userId: string, status: string, timestamp: Date): Promise<void>;

  /**
   * Check if username exists
   */
  usernameExists(username: string): Promise<boolean>;
  emailExists(email: string): Promise<boolean>;

  /**
   * Update user password
   */
  updateUserPassword(userId: string, newPassword: string): Promise<void>;

  /**
   * Mark user email as verified
   */
  markEmailAsVerified(userId: string): Promise<void>;

  /**
   * Save password reset token (create or update)
   */
  savePasswordResetToken(token: PasswordResetToken): Promise<void>;

  /**
   * Find password reset token by token string
   */
  findPasswordResetToken(token: string): Promise<PasswordResetToken | null>;

  /**
   * Find password reset tokens by user ID
   */
  findPasswordResetTokensByUserId(userId: string): Promise<PasswordResetToken[]>;

  /**
   * Save email verification token (create or update)
   */
  saveEmailVerificationToken(token: EmailVerificationToken): Promise<void>;

  /**
   * Find email verification token by token string
   */
  findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null>;

  /**
   * Find email verification tokens by user ID
   */
  findEmailVerificationTokensByUserId(userId: string): Promise<EmailVerificationToken[]>;

  /**
   * Find active sessions by user
   */
  findActiveSessionsByUser(userId: string): Promise<Session[]>;

  /**
   * Find session by ID
   */
  findSessionById(sessionId: string): Promise<Session | null>;

  /**
   * Save session (create or update)
   */
  saveSession(session: Session): Promise<void>;

  /**
   * Find failed login attempts by username/IP
   */
  findRecentFailedLoginAttempts(
    username: string,
    ipAddress: string,
    since: Date,
  ): Promise<FailedLoginAttempt[]>;

  /**
   * Save failed login attempt
   */
  saveFailedLoginAttempt(attempt: FailedLoginAttempt): Promise<void>;
}

export interface IPasswordService {
  /**
   * Hash a plain text password
   */
  hash(password: string): Promise<string>;

  /**
   * Compare plain text password with hash
   */
  compare(password: string, hash: string): Promise<boolean>;
}

export interface ITokenService {
  /**
   * Sign a JWT payload
   */
  sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): string;

  /**
   * Verify and decode a JWT token
   */
  verify<T = unknown>(token: string): T;
}
