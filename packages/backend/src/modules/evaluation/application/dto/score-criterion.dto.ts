/**
 * Score Criterion DTO
 */

import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScoreCriterionDto {
  @ApiProperty({ example: 'communication-skills' })
  @IsString()
  criterionId: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ example: 'Excellent phone etiquette and active listening' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
