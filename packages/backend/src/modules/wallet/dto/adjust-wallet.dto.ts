import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsObject, IsOptional } from 'class-validator';

export class AdjustWalletDto {
  @ApiProperty({ example: -10.50, description: 'Adjustment amount (positive or negative)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Billing correction', description: 'Reason for adjustment (required)' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'correction-123', description: 'External reference', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
