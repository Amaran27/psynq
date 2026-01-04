import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Customer ID', example: 'CUST-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customerId: string;

  @ApiPropertyOptional({ description: 'Initial balance', example: 100, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  balance?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  currency?: string;

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

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
