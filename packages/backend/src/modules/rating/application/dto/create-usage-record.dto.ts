import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  IsDateString,
  IsObject,
} from 'class-validator';
import { UsageType } from '../../infrastructure/persistence/usage-record.entity';

export class CreateUsageRecordDto {
  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Customer ID', example: 'CUST-001' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'Rate plan ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  @IsNotEmpty()
  ratePlanId: string;

  @ApiPropertyOptional({ description: 'Wallet ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsUUID()
  @IsOptional()
  walletId?: string;

  @ApiPropertyOptional({ enum: UsageType, description: 'Usage type', default: UsageType.VOICE_OUTBOUND })
  @IsEnum(UsageType)
  @IsOptional()
  usageType?: UsageType;

  @ApiPropertyOptional({ description: 'Start time', example: '2026-01-04T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time', example: '2026-01-04T10:05:00Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds', example: 300 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Quantity', example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Source number', example: '+1234567890' })
  @IsString()
  @IsOptional()
  sourceNumber?: string;

  @ApiPropertyOptional({ description: 'Destination number', example: '+9876543210' })
  @IsString()
  @IsOptional()
  destinationNumber?: string;

  @ApiPropertyOptional({ description: 'Call ID', example: 'call-12345' })
  @IsString()
  @IsOptional()
  callId?: string;

  @ApiPropertyOptional({ description: 'Campaign ID', example: '123e4567-e89b-12d3-a456-426614174003' })
  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
