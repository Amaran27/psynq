import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class ProcessRatingDto {
  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Maximum records to process', example: 1000, default: 100 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}
