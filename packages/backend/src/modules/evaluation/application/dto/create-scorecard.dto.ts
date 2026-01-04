/**
 * Create Scorecard DTO
 */

import { IsString, IsNotEmpty, IsArray, IsNumber, Min, Max, IsBoolean, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CriterionTypeDto {
  RATING = 'rating',
  YES_NO = 'yes_no',
  TEXT = 'text',
  CHECKLIST = 'checklist',
}

export class ScorecardCriterionDto {
  @ApiProperty({ example: 'communication-skills' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Communication Skills' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Clarity and professionalism in customer interactions' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: CriterionTypeDto, example: CriterionTypeDto.RATING })
  @IsEnum(CriterionTypeDto)
  type: CriterionTypeDto;

  @ApiProperty({ example: 20, description: 'Weight percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  minScore: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  maxScore: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ example: 'soft-skills' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: ['Exceeds expectations', 'Meets expectations', 'Needs improvement'] })
  @IsArray()
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateScorecardDto {
  @ApiProperty({ example: 'Customer Service Quality Scorecard' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Evaluation criteria for customer service interactions' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [ScorecardCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScorecardCriterionDto)
  criteria: ScorecardCriterionDto[];

  @ApiProperty({ example: 70, description: 'Minimum score to pass (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  useWeightedScoring: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
