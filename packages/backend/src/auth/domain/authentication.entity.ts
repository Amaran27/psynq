/**
 * Authentication Domain Entity (Pure TypeScript - No Framework Dependencies)
 *
 * This is the DOMAIN layer in hexagonal architecture.
 * Contains core business logic for authentication.
 *
 * Rules:
 * - No NestJS imports
 * - No TypeORM imports
 * - No bcrypt imports
 * - Pure business logic only
 */

export type UserRole = 'admin' | 'supervisor' | 'agent' | 'sysadmin';

export interface AuthUser {
  id: string;
  username: string;
  roles: UserRole[];
  organizationId: string | null;
  status: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface JwtPayload {
  sub: string; // user id
  username: string;
  roles: UserRole[];
  orgId: string | null;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Authentication Domain Logic
 */
export class Authentication {
  static readonly DEFAULT_ROLE: UserRole = 'agent';
  static readonly ACCESS_TOKEN_EXPIRY = 86400; // 24 hours in seconds
  static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Validates username format
   */
  static isValidUsername(username: string): boolean {
    return username.length >= 3 && username.length <= 50;
  }

  /**
   * Validates password strength
   */
  static isValidPassword(password: string): boolean {
    return password.length >= 8;
  }

  /**
   * Creates JWT payload from user
   */
  static createPayload(user: AuthUser): JwtPayload {
    return {
      sub: user.id,
      username: user.username,
      roles: user.roles,
      orgId: user.organizationId,
    };
  }

  /**
   * Checks if user has required role
   */
  static hasRole(user: AuthUser, requiredRoles: UserRole[]): boolean {
    return user.roles.some((role) => requiredRoles.includes(role));
  }
}
