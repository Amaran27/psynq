import { IsEnum, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportFormat } from '../../../entities/reports/report-template.entity';

export class GenerateReportDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ enum: ExportFormat, example: ExportFormat.PDF })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({ example: { campaignId: '123' } })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}
