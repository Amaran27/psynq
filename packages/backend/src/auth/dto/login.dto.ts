import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for user login
 * Used in: POST /auth/login
 */
export class LoginDto {
  @ApiProperty({
    example: 'john.doe',
    description: 'Username',
  })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
