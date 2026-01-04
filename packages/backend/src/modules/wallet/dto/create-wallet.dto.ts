import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, Min, IsObject } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: 'customer-123', description: 'Customer identifier' })
  @IsString()
  customerId: string;

  @ApiProperty({ enum: ['prepaid', 'postpaid'], default: 'prepaid' })
  @IsEnum(['prepaid', 'postpaid'])
  type: string;

  @ApiProperty({ enum: ['USD', 'EUR', 'GBP', 'INR'], default: 'USD' })
  @IsEnum(['USD', 'EUR', 'GBP', 'INR'])
  currency: string;

  @ApiProperty({ example: 100, description: 'Initial balance', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialBalance?: number;

  @ApiProperty({ example: 1000, description: 'Credit limit for postpaid', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiProperty({ example: 10, description: 'Low balance alert threshold', default: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lowBalanceThreshold?: number;

  @ApiProperty({ example: false, description: 'Enable auto-recharge', default: false })
  @IsBoolean()
  @IsOptional()
  autoRecharge?: boolean;

  @ApiProperty({ example: 50, description: 'Auto-recharge amount', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  autoRechargeAmount?: number;

  @ApiProperty({ example: 5, description: 'Auto-recharge trigger balance', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  autoRechargeTrigger?: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  organizationId?: string; // Set from JWT
}
