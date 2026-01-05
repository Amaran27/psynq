import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ForecastInterval, ForecastType } from '../domain/forecast.domain';

export class ForecastQueryDto {
  @ApiPropertyOptional({ enum: ForecastType, description: 'Filter by forecast type' })
  @IsOptional()
  @IsEnum(ForecastType)
  type?: ForecastType;

  @ApiPropertyOptional({ enum: ForecastInterval, description: 'Filter by interval' })
  @IsOptional()
  @IsEnum(ForecastInterval)
  interval?: ForecastInterval;

  @ApiPropertyOptional({ description: 'Filter by start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Model ID to filter by' })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional({ description: 'Number of results per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['createdAt', 'startDate'] })
  @IsOptional()
  @IsEnum(['createdAt', 'startDate'])
  sortBy?: 'createdAt' | 'startDate' = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
