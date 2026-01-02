import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for refreshing access token
 * Used in: POST /auth/refresh
 */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token obtained from login or previous refresh',
  })
  @IsString()
  refresh_token: string;
}
