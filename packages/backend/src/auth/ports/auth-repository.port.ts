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
