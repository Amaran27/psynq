import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrainModelDto {
  @ApiProperty({ description: 'Model ID to train' })
  @IsUUID()
  modelId: string;

  @ApiProperty({ description: 'Training data start date (ISO 8601)' })
  @IsDateString()
  trainingDataFrom: string;

  @ApiProperty({ description: 'Training data end date (ISO 8601)' })
  @IsDateString()
  trainingDataTo: string;

  @ApiPropertyOptional({ description: 'Override hyperparameters' })
  @IsOptional()
  @IsObject()
  hyperparameters?: Record<string, any>;
}
