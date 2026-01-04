/**
 * Update Feedback DTO
 */

import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeedbackDto {
  @ApiPropertyOptional({ example: 'Overall strong performance with minor areas for improvement' })
  @IsString()
  @IsOptional()
  generalFeedback?: string;

  @ApiPropertyOptional({ example: ['Excellent problem resolution', 'Professional demeanor'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  strengths?: string[];

  @ApiPropertyOptional({ example: ['Reduce hold time', 'Improve product knowledge'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  areasForImprovement?: string[];

  @ApiPropertyOptional({ example: ['Complete product training module', 'Shadow senior agent'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actionItems?: string[];
}
