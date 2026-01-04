import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { PacingAlgorithm } from '../../../entities/dialer/pacing-engine.entity';

export class CreatePacingEngineDto {
  @ApiPropertyOptional({
    description: 'Campaign ID this pacing engine is associated with',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Dialing session ID this pacing engine is associated with',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description: 'Pacing algorithm to use',
    enum: PacingAlgorithm,
    default: PacingAlgorithm.ERLANG_C,
    example: PacingAlgorithm.ERLANG_C,
  })
  @IsEnum(PacingAlgorithm)
  algorithm: PacingAlgorithm;

  @ApiProperty({
    description: 'Target abandonment rate as percentage (0-100)',
    example: 3.0,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  targetAbandonmentRate: number;

  @ApiProperty({
    description: 'Maximum concurrent calls allowed',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  maxConcurrentCalls: number;

  @ApiProperty({
    description: 'Number of lines per agent',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  linesPerAgent: number;

  @ApiProperty({
    description: 'Dial timeout in seconds',
    example: 30,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  dialTimeoutSeconds: number;

  @ApiProperty({
    description: 'Minimum agents required to start dialing',
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  minAgentsRequired: number;

  @ApiPropertyOptional({
    description: 'Custom tuning parameters (JSON object)',
    example: { aggressiveness: 1.2, warmUpTime: 300 },
  })
  @IsOptional()
  @IsObject()
  customParameters?: Record<string, any>;
}
