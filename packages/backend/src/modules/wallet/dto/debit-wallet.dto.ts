import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, IsObject } from 'class-validator';

export class DebitWalletDto {
  @ApiProperty({ example: 25.50, description: 'Amount to debit' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Campaign call charge', description: 'Reason for debit' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'call-cdr-123', description: 'External reference', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ example: 'call', description: 'Reference type', required: false })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
