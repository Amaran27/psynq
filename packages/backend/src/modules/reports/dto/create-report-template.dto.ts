import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsUUID,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReportType,
  ExportFormat,
  ReportStatus,
  DateRangeType,
} from '../../../entities/reports/report-template.entity';

class ColumnConfigDto {
  @ApiProperty({ example: 'callDuration' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({ example: 'Call Duration' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: ['string', 'number', 'date', 'boolean'], example: 'number' })
  @IsEnum(['string', 'number', 'date', 'boolean'])
  type: 'string' | 'number' | 'date' | 'boolean';

  @ApiPropertyOptional({ example: '0.00' })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiPropertyOptional({ enum: ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'] })
  @IsEnum(['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'])
  @IsOptional()
  aggregate?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
}

class FilterConfigDto {
  @ApiProperty({ example: 'status' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({ enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'like'], example: 'eq' })
  @IsEnum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'like'])
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';

  @ApiProperty({ example: 'completed' })
  value: any;
}

class SortConfigDto {
  @ApiProperty({ example: 'createdAt' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsEnum(['ASC', 'DESC'])
  direction: 'ASC' | 'DESC';
}

class LayoutConfigDto {
  @ApiPropertyOptional({ enum: ['portrait', 'landscape'], example: 'portrait' })
  @IsEnum(['portrait', 'landscape'])
  @IsOptional()
  orientation?: 'portrait' | 'landscape';

  @ApiPropertyOptional({ enum: ['A4', 'Letter', 'Legal'], example: 'A4' })
  @IsEnum(['A4', 'Letter', 'Legal'])
  @IsOptional()
  pageSize?: 'A4' | 'Letter' | 'Legal';

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  margins?: { top: number; right: number; bottom: number; left: number };

  @ApiPropertyOptional({ example: '<h1>Company Report</h1>' })
  @IsString()
  @IsOptional()
  headerTemplate?: string;

  @ApiPropertyOptional({ example: '<p>Page {page}</p>' })
  @IsString()
  @IsOptional()
  footerTemplate?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  includeChart?: boolean;

  @ApiPropertyOptional({ enum: ['bar', 'line', 'pie', 'table'] })
  @IsEnum(['bar', 'line', 'pie', 'table'])
  @IsOptional()
  chartType?: 'bar' | 'line' | 'pie' | 'table';
}

export class CreateReportTemplateDto {
  @ApiProperty({ example: 'Daily CDR Report', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Daily call detail records summary' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ReportType, example: ReportType.CDR })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ enum: ReportStatus, default: ReportStatus.DRAFT })
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({ example: 'SELECT * FROM cdr WHERE date >= $1 AND date <= $2' })
  @IsString()
  @IsOptional()
  queryTemplate?: string;

  @ApiPropertyOptional({ example: { campaignId: '123' } })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @ApiProperty({ type: [ColumnConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnConfigDto)
  columns: ColumnConfigDto[];

  @ApiPropertyOptional({ type: [FilterConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConfigDto)
  @IsOptional()
  filters?: FilterConfigDto[];

  @ApiPropertyOptional({ type: [SortConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortConfigDto)
  @IsOptional()
  sorting?: SortConfigDto[];

  @ApiPropertyOptional({ example: ['campaignId', 'agentId'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  groupBy?: string[];

  @ApiProperty({ enum: DateRangeType, example: DateRangeType.LAST_7_DAYS })
  @IsEnum(DateRangeType)
  dateRangeType: DateRangeType;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  customStartDate?: string;

  @ApiPropertyOptional({ example: '2024-01-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  customEndDate?: string;

  @ApiProperty({ enum: ExportFormat, isArray: true, example: [ExportFormat.PDF, ExportFormat.CSV] })
  @IsArray()
  @IsEnum(ExportFormat, { each: true })
  supportedFormats: ExportFormat[];

  @ApiProperty({ enum: ExportFormat, example: ExportFormat.PDF })
  @IsEnum(ExportFormat)
  defaultFormat: ExportFormat;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isScheduled?: boolean;

  @ApiPropertyOptional({ example: '0 9 * * *' })
  @IsString()
  @IsOptional()
  scheduleExpression?: string;

  @ApiPropertyOptional({ example: ['admin@example.com'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  emailRecipients?: string[];

  @ApiPropertyOptional({ type: LayoutConfigDto })
  @IsObject()
  @ValidateNested()
  @Type(() => LayoutConfigDto)
  @IsOptional()
  layoutConfig?: LayoutConfigDto;
}
