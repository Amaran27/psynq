import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ModelType, ModelStatus } from '../domain/forecast-model.domain';

export class ModelQueryDto {
  @ApiPropertyOptional({ enum: ModelType, description: 'Filter by model type' })
  @IsOptional()
  @IsEnum(ModelType)
  type?: ModelType;

  @ApiPropertyOptional({ enum: ModelStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ModelStatus)
  status?: ModelStatus;

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
}
