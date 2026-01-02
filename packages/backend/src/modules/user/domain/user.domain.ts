import { AgentStatus } from '@psynq/core';

/**
 * User Domain Entity
 * Pure TypeScript - NO framework imports
 *
 * This is the heart of the domain. It contains business logic
 * and validation rules independent of any framework.
 */
export class User {
  private _password: string;

  constructor(
    public readonly id: string,
    public username: string,
    public email: string,
    password: string,
    public firstName: string = '',
    public lastName: string = '',
    public phone: string | null = null,
    public organizationId: string | null = null,
    public roles: UserRole[] = [UserRole.AGENT],
    public primaryRole: UserRole | null = null,
    public status: AgentStatus = AgentStatus.OFFLINE,
    public skills: string[] = [],
    public lastStatusChangedAt: Date | null = null,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {
    this._password = password;
  }

  /**
   * Password getter/setter
   * Private password with controlled access
   */
  get password(): string {
    return this._password;
  }

  set password(value: string) {
    this._password = value;
  }

  /**
   * Domain Logic: Validate status transition
   * Business rule: Only certain status transitions are allowed
   */
  canTransitionTo(newStatus: AgentStatus): boolean {
    const allowedTransitions: Record<AgentStatus, AgentStatus[]> = {
      [AgentStatus.OFFLINE]: [AgentStatus.AVAILABLE, AgentStatus.BREAK],
      [AgentStatus.AVAILABLE]: [
        AgentStatus.BUSY,
        AgentStatus.BREAK,
        AgentStatus.OFFLINE,
        AgentStatus.WRAP_UP,
      ],
      [AgentStatus.BUSY]: [AgentStatus.WRAP_UP, AgentStatus.OFFLINE],
      [AgentStatus.BREAK]: [AgentStatus.AVAILABLE, AgentStatus.OFFLINE],
      [AgentStatus.WRAP_UP]: [AgentStatus.AVAILABLE, AgentStatus.OFFLINE],
    };

    return allowedTransitions[this.status]?.includes(newStatus) ?? false;
  }

  /**
   * Domain Logic: Update status
   * Returns boolean success instead of throwing
   */
  updateStatus(newStatus: AgentStatus): boolean {
    if (!this.canTransitionTo(newStatus)) {
      return false;
    }
    this.status = newStatus;
    this.lastStatusChangedAt = new Date();
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Domain Logic: Assign roles
   */
  assignRoles(roles: UserRole[], primaryRole?: UserRole): void {
    if (roles.length === 0) {
      throw new Error('At least one role must be assigned');
    }
    if (primaryRole && !roles.includes(primaryRole)) {
      throw new Error('Primary role must be one of the assigned roles');
    }
    this.roles = roles;
    this.primaryRole = primaryRole || roles[0];
    this.updatedAt = new Date();
  }

  /**
   * Domain Logic: Check if user has role
   */
  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  /**
   * Domain Logic: Check if user is available for calls
   */
  isAvailable(): boolean {
    return this.status === AgentStatus.AVAILABLE;
  }

  /**
   * Domain Logic: Update user details
   */
  update(updates: Partial<UserUpdateData>): void {
    if (updates.email !== undefined) this.email = updates.email;
    if (updates.firstName !== undefined) this.firstName = updates.firstName;
    if (updates.lastName !== undefined) this.lastName = updates.lastName;
    if (updates.phone !== undefined) this.phone = updates.phone;
    if (updates.skills !== undefined) this.skills = updates.skills;
    this.updatedAt = new Date();
  }
}

export enum UserRole {
  AGENT = 'agent',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  SYSTEM_ADMIN = 'system_admin',
}

export interface UserUpdateData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  skills?: string[];
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  organizationId?: string;
  roles?: UserRole[];
  status?: AgentStatus;
  skills?: string[];
}
