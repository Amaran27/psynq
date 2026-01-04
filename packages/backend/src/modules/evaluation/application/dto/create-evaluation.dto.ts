/**
 * Create Evaluation DTO
 */

import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEvaluationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  scorecardId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsUUID()
  @IsOptional()
  callId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174003' })
  @IsUUID()
  @IsOptional()
  recordingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
