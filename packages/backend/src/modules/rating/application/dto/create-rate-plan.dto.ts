import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsObject,
  IsDateString,
} from 'class-validator';
import { RatePlanType, ChargeType, RoundingMethod } from '../../infrastructure/persistence/rate-plan.entity';

export class CreateRatePlanDto {
  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Rate plan name', example: 'Standard Prepaid Plan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: RatePlanType, description: 'Rate plan type' })
  @IsEnum(RatePlanType)
  type: RatePlanType;

  @ApiPropertyOptional({ description: 'Rate plan description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ChargeType, description: 'Charge type', default: ChargeType.PER_MINUTE })
  @IsEnum(ChargeType)
  @IsOptional()
  chargeType?: ChargeType;

  @ApiPropertyOptional({ description: 'Base rate per unit', example: 0.05, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  baseRate?: number;

  @ApiPropertyOptional({ description: 'Minimum charge per call', example: 0.01, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumCharge?: number;

  @ApiPropertyOptional({ enum: RoundingMethod, description: 'Rounding method', default: RoundingMethod.CEIL })
  @IsEnum(RoundingMethod)
  @IsOptional()
  roundingMethod?: RoundingMethod;

  @ApiPropertyOptional({ description: 'Rounding increment', example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  roundingIncrement?: number;

  @ApiPropertyOptional({ description: 'Free seconds per call', example: 60, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  freeSeconds?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Billing cycle in days', example: 30, default: 30 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  billingCycle?: number;

  @ApiPropertyOptional({ description: 'Grace period in days', example: 7, default: 7 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  gracePeriodDays?: number;

  @ApiPropertyOptional({ description: 'Low balance threshold', example: 10, default: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lowBalanceThreshold?: number;

  @ApiPropertyOptional({ description: 'Enable auto recharge', default: false })
  @IsBoolean()
  @IsOptional()
  autoRecharge?: boolean;

  @ApiPropertyOptional({ description: 'Auto recharge amount', example: 50 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  autoRechargeAmount?: number;

  @ApiPropertyOptional({ description: 'Auto recharge threshold', example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  autoRechargeThreshold?: number;

  @ApiPropertyOptional({ description: 'Effective from date', example: '2026-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: 'Effective to date', example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
