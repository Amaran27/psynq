import {
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for user registration
 * Used in: POST /auth/register
 */
export class RegisterUserDto {
  @ApiProperty({
    example: 'john.doe',
    description: 'Unique username for login (3-50 characters)',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization ID (optional)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    example: ['agent'],
    description: 'Initial roles (defaults to [agent])',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
