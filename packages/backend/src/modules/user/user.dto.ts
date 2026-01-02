import {
  IsString,
  IsEmail,
  MinLength,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsUUID,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from './domain/user.domain';
import { AgentStatus } from '@psynq/core';

/**
 * Simple organization DTO for user responses
 */
export class UserOrganizationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization ID',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: 'Acme Corp', description: 'Organization name' })
  name: string;
}

/**
 * Data Transfer Object for creating a new user
 * Used in: POST /users
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe',
    description: 'Unique username for login',
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123',
    description: 'User password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    isArray: true,
    example: [UserRole.AGENT],
    description: 'User roles',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.AGENT,
    description: 'Primary role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  primaryRole?: UserRole;

  @ApiPropertyOptional({
    enum: AgentStatus,
    example: AgentStatus.OFFLINE,
    description: 'Initial agent status',
  })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @ApiPropertyOptional({
    example: ['sales', 'support'],
    description: 'Agent skills',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

/**
 * Data Transfer Object for updating an existing user
 * Used in: PATCH /users/:id
 * All fields are optional for partial updates
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'john.doe', description: 'Updated username' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Updated email address',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    isArray: true,
    example: [UserRole.AGENT, UserRole.SUPERVISOR],
    description: 'Updated roles',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.AGENT,
    description: 'Primary role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  primaryRole?: UserRole;

  @ApiPropertyOptional({
    enum: AgentStatus,
    example: AgentStatus.AVAILABLE,
    description: 'Updated status',
  })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @ApiPropertyOptional({
    example: ['sales', 'tech support'],
    description: 'Agent skills',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the user is active',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Data Transfer Object for changing user password
 * Used in: POST /users/:id/change-password
 */
export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPass123',
    description: 'Current password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  oldPassword: string;

  @ApiProperty({
    example: 'NewPass456',
    description: 'New password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiPropertyOptional({
    example: 'NewPass456',
    description: 'Confirm new password',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  confirmPassword?: string;
}

/**
 * Data Transfer Object for assigning roles to user
 * Used in: POST /users/:id/roles
 */
export class AssignRolesDto {
  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.AGENT, UserRole.SUPERVISOR],
    description: 'Roles to assign',
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.SUPERVISOR,
    description: 'Primary role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  primaryRole?: UserRole;
}

/**
 * Data Transfer Object for updating agent status
 * Used in: PATCH /users/:id/status
 */
export class UpdateAgentStatusDto {
  @ApiProperty({
    enum: AgentStatus,
    example: AgentStatus.AVAILABLE,
    description: 'New agent status',
  })
  @IsEnum(AgentStatus)
  status: AgentStatus;

  @ApiPropertyOptional({
    example: 'Starting shift',
    description: 'Reason for status change',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Data Transfer Object for querying/listing users
 * Used in: GET /users
 */
export class QueryUsersDto {
  @ApiPropertyOptional({
    example: 'john',
    description: 'Search by username, email, or name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    isArray: true,
    example: [UserRole.AGENT],
    description: 'Filter by roles',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @ApiPropertyOptional({
    enum: AgentStatus,
    example: AgentStatus.AVAILABLE,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by organization ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Page number (default: 1)',
    type: Number,
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    example: '10',
    description: 'Items per page (default: 10)',
    type: Number,
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Data Transfer Object for user response
 * Used in responses from user endpoints
 * Excludes sensitive data like password
 */
export class UserResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: 'john.doe', description: 'Username' })
  username: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  email?: string;

  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  phone?: string;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.AGENT],
    description: 'User roles',
  })
  roles: UserRole[];

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.AGENT,
    description: 'Primary role',
  })
  primaryRole?: UserRole;

  @ApiProperty({
    enum: AgentStatus,
    example: AgentStatus.OFFLINE,
    description: 'Current status',
  })
  status: AgentStatus;

  @ApiProperty({
    example: ['sales', 'support'],
    description: 'Agent skills',
    type: [String],
  })
  skills: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization ID',
    format: 'uuid',
  })
  organizationId?: string;

  @ApiPropertyOptional({
    type: UserOrganizationDto,
    description: 'Organization details',
    nullable: true,
  })
  organization?: UserOrganizationDto;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Last status change timestamp',
    type: Date,
  })
  lastStatusChangedAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Creation timestamp',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Last update timestamp',
    type: Date,
  })
  updatedAt: Date;
}

/**
 * Data Transfer Object for paginated user list response
 */
export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto], description: 'Array of users' })
  data: UserResponseDto[];

  @ApiProperty({ example: 100, description: 'Total number of users' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number;
}

/**
 * Data Transfer Object for user creation response
 * Includes non-sensitive fields only
 */
export class UserCreatedResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Created user ID',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: 'john.doe', description: 'Username' })
  username: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  email?: string;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.AGENT],
    description: 'Assigned roles',
  })
  roles: UserRole[];

  @ApiProperty({
    enum: AgentStatus,
    example: AgentStatus.OFFLINE,
    description: 'Initial status',
  })
  status: AgentStatus;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Creation timestamp',
    type: Date,
  })
  createdAt: Date;
}
