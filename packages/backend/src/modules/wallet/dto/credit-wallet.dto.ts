import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, IsObject } from 'class-validator';

export class CreditWalletDto {
  @ApiProperty({ example: 100, description: 'Amount to credit' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Manual top-up', description: 'Reason for credit' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'invoice-123', description: 'External reference', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ example: 'invoice', description: 'Reference type', required: false })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
