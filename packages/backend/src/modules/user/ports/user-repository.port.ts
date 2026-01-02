import { User, CreateUserData, UserRole } from '../domain/user.domain';
import { AgentStatus } from '@psynq/core';

/**
 * User Repository Port (Interface)
 *
 * This is a PORT in hexagonal architecture.
 * It defines what operations the domain needs from persistence,
 * but NOT how they're implemented.
 *
 * NO framework imports. Pure interfaces.
 */
export interface IUserRepository {
  /**
   * Create a new user
   */
  create(data: CreateUserData, hashedPassword: string): Promise<User>;

  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find all users with filters
   */
  findAll(filters: UserFilters): Promise<PaginatedUsers>;

  /**
   * Find users by role
   */
  findByRole(role: UserRole): Promise<User[]>;

  /**
   * Find users by status
   */
  findByStatus(status: AgentStatus): Promise<User[]>;

  /**
   * Save user (update)
   */
  save(user: User): Promise<User>;

  /**
   * Delete user
   */
  delete(id: string): Promise<void>;

  /**
   * Check if username exists
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * Check if email exists
   */
  existsByEmail(email: string): Promise<boolean>;
}

/**
 * Password Service Port
 * Defines password operations without implementation details
 */
export interface IPasswordService {
  /**
   * Hash a password
   */
  hash(password: string): Promise<string>;

  /**
   * Compare password with hash
   */
  compare(password: string, hash: string): Promise<boolean>;
}

export interface UserFilters {
  search?: string;
  roles?: UserRole[];
  status?: AgentStatus;
  organizationId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
