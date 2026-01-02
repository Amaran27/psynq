import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for authentication tokens response
 * Used in responses from: POST /auth/login, POST /auth/refresh, POST /auth/register
 */
export class AuthTokensResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token for API authentication',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token for obtaining new access tokens',
  })
  refresh_token: string;

  @ApiProperty({
    example: 86400,
    description: 'Access token expiry time in seconds (default: 24 hours)',
  })
  expires_in: number;

  @ApiProperty({
    example: 'Bearer',
    description: 'Token type (always Bearer for JWT)',
  })
  token_type: string;
}

/**
 * Data Transfer Object for user profile after authentication
 * Used in responses from: POST /auth/login, GET /auth/profile
 */
export class AuthUserDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    example: 'john.doe',
    description: 'Username',
  })
  username: string;

  @ApiProperty({
    example: ['agent'],
    description: 'User roles',
    type: [String],
  })
  roles: string[];

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization ID',
    format: 'uuid',
    nullable: true,
  })
  organizationId?: string;

  @ApiProperty({
    example: 'available',
    description: 'Current agent status',
  })
  status: string;
}

/**
 * Data Transfer Object for agent status response
 * Used in response from: GET /auth/status
 */
export class StatusResponseDto {
  @ApiProperty({
    example: 'available',
    description: 'Current agent status',
  })
  status: string;
}

/**
 * Data Transfer Object for successful status update
 * Used in response from: POST /auth/status
 */
export class StatusUpdateResponseDto {
  @ApiProperty({
    example: 'available',
    description: 'Updated agent status',
  })
  status: string;

  @ApiProperty({
    example: '2024-01-01T12:00:00.000Z',
    description: 'Timestamp of status update',
  })
  updatedAt: string;
}
