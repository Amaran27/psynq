import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsObject,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModelType } from '../domain/forecast-model.domain';

export class CreateModelDto {
  @ApiProperty({ description: 'Model name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Model description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: ModelType, description: 'Type of ML model' })
  @IsEnum(ModelType)
  type: ModelType;

  @ApiProperty({ description: 'Training data start date (ISO 8601)' })
  @IsDateString()
  trainingDataFrom: string;

  @ApiProperty({ description: 'Training data end date (ISO 8601)' })
  @IsDateString()
  trainingDataTo: string;

  @ApiProperty({ description: 'Features to use for training' })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Minimum number of training samples' })
  @IsInt()
  @Min(10)
  minSamples: number;

  @ApiPropertyOptional({ description: 'Model hyperparameters' })
  @IsOptional()
  @IsObject()
  hyperparameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
