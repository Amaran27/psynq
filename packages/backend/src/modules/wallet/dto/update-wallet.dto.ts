import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsBoolean, IsOptional, Min, IsObject } from 'class-validator';

export class UpdateWalletDto {
  @ApiProperty({ enum: ['prepaid', 'postpaid'], required: false })
  @IsEnum(['prepaid', 'postpaid'])
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 1000, description: 'Credit limit', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiProperty({ example: 10, description: 'Low balance threshold', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lowBalanceThreshold?: number;

  @ApiProperty({ example: true, description: 'Enable auto-recharge', required: false })
  @IsBoolean()
  @IsOptional()
  autoRecharge?: boolean;

  @ApiProperty({ example: 50, description: 'Auto-recharge amount', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  autoRechargeAmount?: number;

  @ApiProperty({ example: 5, description: 'Auto-recharge trigger', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  autoRechargeTrigger?: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
