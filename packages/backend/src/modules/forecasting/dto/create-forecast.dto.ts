import {
  IsString,
  IsEnum,
  IsUUID,
  IsDateString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForecastInterval, ForecastType } from '../domain/forecast.domain';

export class CreateForecastDto {
  @ApiProperty({ description: 'Forecast name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ForecastType, description: 'Type of forecast' })
  @IsEnum(ForecastType)
  type: ForecastType;

  @ApiProperty({ enum: ForecastInterval, description: 'Forecast interval' })
  @IsEnum(ForecastInterval)
  interval: ForecastInterval;

  @ApiProperty({ description: 'Forecast start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Forecast end date (ISO 8601)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Model ID to use for forecast' })
  @IsUUID()
  modelId: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
