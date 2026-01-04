import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from '../organization.entity';

export enum ReportType {
  CDR = 'CDR',
  CAMPAIGN_SUMMARY = 'CAMPAIGN_SUMMARY',
  AGENT_PERFORMANCE = 'AGENT_PERFORMANCE',
  CALL_QUALITY = 'CALL_QUALITY',
  DISPOSITION = 'DISPOSITION',
  HOURLY_TRAFFIC = 'HOURLY_TRAFFIC',
  CUSTOM = 'CUSTOM',
}

export enum ExportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  JSON = 'JSON',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum DateRangeType {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  CUSTOM = 'CUSTOM',
}

@Entity('report_templates')
export class ReportTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportType,
    default: ReportType.CUSTOM,
  })
  type: ReportType;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.DRAFT,
  })
  status: ReportStatus;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  // Query template for data retrieval
  @Column({ type: 'text', nullable: true })
  queryTemplate: string;

  // Parameters for the query (JSONB)
  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  // Columns to include in report
  @Column({ type: 'jsonb' })
  columns: Array<{
    field: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    format?: string;
    aggregate?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  }>;

  // Filters for the report
  @Column({ type: 'jsonb', nullable: true })
  filters: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
    value: any;
  }>;

  // Sorting configuration
  @Column({ type: 'jsonb', nullable: true })
  sorting: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;

  // Grouping configuration
  @Column({ type: 'jsonb', nullable: true })
  groupBy: string[];

  // Date range settings
  @Column({
    type: 'enum',
    enum: DateRangeType,
    default: DateRangeType.CUSTOM,
  })
  dateRangeType: DateRangeType;

  @Column({ type: 'timestamptz', nullable: true })
  customStartDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  customEndDate: Date;

  // Export format preferences
  @Column({
    type: 'enum',
    enum: ExportFormat,
    default: ExportFormat.PDF,
    array: true,
  })
  supportedFormats: ExportFormat[];

  @Column({
    type: 'enum',
    enum: ExportFormat,
    default: ExportFormat.PDF,
  })
  defaultFormat: ExportFormat;

  // Scheduling (for future use)
  @Column({ type: 'boolean', default: false })
  isScheduled: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  scheduleExpression: string; // Cron expression

  @Column({ type: 'jsonb', nullable: true })
  emailRecipients: string[];

  // Usage statistics
  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastExecutedAt: Date;

  @Column({ type: 'int', nullable: true })
  lastExecutionDurationMs: number;

  // Layout and styling (for PDF exports)
  @Column({ type: 'jsonb', nullable: true })
  layoutConfig: {
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'A4' | 'Letter' | 'Legal';
    margins?: { top: number; right: number; bottom: number; left: number };
    headerTemplate?: string;
    footerTemplate?: string;
    includeChart?: boolean;
    chartType?: 'bar' | 'line' | 'pie' | 'table';
  };

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
