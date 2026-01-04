import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class SyncContactsDto {
  @ApiProperty({ description: 'CRM Integration UUID' })
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @ApiPropertyOptional({ description: 'Filter conditions', example: { Status: 'Active' } })
  @IsObject()
  @IsOptional()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Maximum records to sync', minimum: 1, maximum: 1000, default: 100 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number;
}

export class SyncLeadsDto {
  @ApiProperty({ description: 'CRM Integration UUID' })
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @ApiPropertyOptional({ description: 'Filter conditions', example: { Status: 'Open' } })
  @IsObject()
  @IsOptional()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Maximum records to sync', minimum: 1, maximum: 1000, default: 100 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number;
}
