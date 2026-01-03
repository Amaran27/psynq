import { ApiProperty } from '@nestjs/swagger';

export class SessionDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Refresh token (truncated for security)',
    example: 'a1b2c3d4...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Session expiration time',
    example: '2026-01-04T12:00:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'IP address of the session',
    example: '192.168.1.1',
    required: false,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent of the session',
    example: 'Mozilla/5.0...',
    required: false,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'Whether the session is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Session creation time',
    example: '2026-01-03T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last activity time',
    example: '2026-01-03T14:30:00.000Z',
    required: false,
  })
  lastActivityAt?: Date;
}

export class SessionsResponseDto {
  @ApiProperty({
    description: 'List of active sessions',
    type: [SessionDto],
  })
  sessions: SessionDto;

  @ApiProperty({
    description: 'Total number of sessions',
    example: 3,
  })
  total: number;
}
