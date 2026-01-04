import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';
import { TransactionType } from '../../domain/customer-wallet.domain';

export class WalletTransactionDto {
  @ApiProperty({ enum: TransactionType, description: 'Transaction type' })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ description: 'Transaction amount', example: 50 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ description: 'Transaction description', example: 'Monthly recharge' })
  @IsString()
  @IsOptional()
  description?: string;
}
