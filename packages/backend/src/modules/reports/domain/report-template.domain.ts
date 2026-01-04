import {
  ReportType,
  ExportFormat,
  ReportStatus,
  DateRangeType,
} from '../../../entities/reports/report-template.entity';

export interface ColumnConfig {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  aggregate?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: any;
}

export interface SortConfig {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface LayoutConfig {
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter' | 'Legal';
  margins?: { top: number; right: number; bottom: number; left: number };
  headerTemplate?: string;
  footerTemplate?: string;
  includeChart?: boolean;
  chartType?: 'bar' | 'line' | 'pie' | 'table';
}

export interface ReportTemplateProps {
  id?: string;
  name: string;
  description?: string;
  type: ReportType;
  status: ReportStatus;
  organizationId: string;
  createdBy?: string;
  queryTemplate?: string;
  parameters?: Record<string, any>;
  columns: ColumnConfig[];
  filters?: FilterConfig[];
  sorting?: SortConfig[];
  groupBy?: string[];
  dateRangeType: DateRangeType;
  customStartDate?: Date;
  customEndDate?: Date;
  supportedFormats: ExportFormat[];
  defaultFormat: ExportFormat;
  isScheduled?: boolean;
  scheduleExpression?: string;
  emailRecipients?: string[];
  executionCount?: number;
  lastExecutedAt?: Date;
  lastExecutionDurationMs?: number;
  layoutConfig?: LayoutConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ReportTemplate {
  public readonly id?: string;
  public readonly name: string;
  public readonly description?: string;
  public readonly type: ReportType;
  public status: ReportStatus;
  public readonly organizationId: string;
  public readonly createdBy?: string;
  public readonly queryTemplate?: string;
  public parameters?: Record<string, any>;
  public columns: ColumnConfig[];
  public filters?: FilterConfig[];
  public sorting?: SortConfig[];
  public groupBy?: string[];
  public dateRangeType: DateRangeType;
  public customStartDate?: Date;
  public customEndDate?: Date;
  public supportedFormats: ExportFormat[];
  public defaultFormat: ExportFormat;
  public isScheduled: boolean;
  public scheduleExpression?: string;
  public emailRecipients?: string[];
  public executionCount: number;
  public lastExecutedAt?: Date;
  public lastExecutionDurationMs?: number;
  public layoutConfig?: LayoutConfig;
  public readonly createdAt?: Date;
  public updatedAt?: Date;

  constructor(props: ReportTemplateProps) {
    this.validate(props);

    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.type = props.type;
    this.status = props.status;
    this.organizationId = props.organizationId;
    this.createdBy = props.createdBy;
    this.queryTemplate = props.queryTemplate;
    this.parameters = props.parameters || {};
    this.columns = props.columns;
    this.filters = props.filters || [];
    this.sorting = props.sorting || [];
    this.groupBy = props.groupBy || [];
    this.dateRangeType = props.dateRangeType;
    this.customStartDate = props.customStartDate;
    this.customEndDate = props.customEndDate;
    this.supportedFormats = props.supportedFormats;
    this.defaultFormat = props.defaultFormat;
    this.isScheduled = props.isScheduled || false;
    this.scheduleExpression = props.scheduleExpression;
    this.emailRecipients = props.emailRecipients || [];
    this.executionCount = props.executionCount || 0;
    this.lastExecutedAt = props.lastExecutedAt;
    this.lastExecutionDurationMs = props.lastExecutionDurationMs;
    this.layoutConfig = props.layoutConfig;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  private validate(props: ReportTemplateProps): void {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Report name is required');
    }

    if (props.name.length > 255) {
      throw new Error('Report name must not exceed 255 characters');
    }

    if (!props.organizationId) {
      throw new Error('Organization ID is required');
    }

    if (!props.columns || props.columns.length === 0) {
      throw new Error('At least one column must be defined');
    }

    if (!props.supportedFormats || props.supportedFormats.length === 0) {
      throw new Error('At least one export format must be supported');
    }

    if (!props.supportedFormats.includes(props.defaultFormat)) {
      throw new Error('Default format must be in supported formats');
    }

    if (props.dateRangeType === DateRangeType.CUSTOM) {
      if (!props.customStartDate || !props.customEndDate) {
        throw new Error(
          'Custom start and end dates are required for CUSTOM date range type',
        );
      }

      if (props.customStartDate > props.customEndDate) {
        throw new Error('Start date must be before end date');
      }
    }

    if (props.isScheduled && !props.scheduleExpression) {
      throw new Error('Schedule expression is required for scheduled reports');
    }

    // Validate columns
    props.columns.forEach((col, index) => {
      if (!col.field || !col.label) {
        throw new Error(
          `Column at index ${index} must have field and label`,
        );
      }
    });
  }

  public activate(): void {
    if (this.status === ReportStatus.ARCHIVED) {
      throw new Error('Cannot activate an archived report');
    }
    this.status = ReportStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  public archive(): void {
    if (this.isScheduled) {
      throw new Error(
        'Cannot archive a scheduled report. Disable scheduling first.',
      );
    }
    this.status = ReportStatus.ARCHIVED;
    this.updatedAt = new Date();
  }

  public draft(): void {
    this.status = ReportStatus.DRAFT;
    this.updatedAt = new Date();
  }

  public enableScheduling(cronExpression: string, recipients?: string[]): void {
    if (!cronExpression) {
      throw new Error('Cron expression is required');
    }

    if (this.status !== ReportStatus.ACTIVE) {
      throw new Error('Only active reports can be scheduled');
    }

    this.isScheduled = true;
    this.scheduleExpression = cronExpression;
    if (recipients && recipients.length > 0) {
      this.emailRecipients = recipients;
    }
    this.updatedAt = new Date();
  }

  public disableScheduling(): void {
    this.isScheduled = false;
    this.scheduleExpression = undefined;
    this.updatedAt = new Date();
  }

  public recordExecution(durationMs: number): void {
    this.executionCount++;
    this.lastExecutedAt = new Date();
    this.lastExecutionDurationMs = durationMs;
    this.updatedAt = new Date();
  }

  public updateColumns(columns: ColumnConfig[]): void {
    if (!columns || columns.length === 0) {
      throw new Error('At least one column must be defined');
    }

    columns.forEach((col, index) => {
      if (!col.field || !col.label) {
        throw new Error(
          `Column at index ${index} must have field and label`,
        );
      }
    });

    this.columns = columns;
    this.updatedAt = new Date();
  }

  public updateFilters(filters: FilterConfig[]): void {
    this.filters = filters || [];
    this.updatedAt = new Date();
  }

  public updateSorting(sorting: SortConfig[]): void {
    this.sorting = sorting || [];
    this.updatedAt = new Date();
  }

  public updateDateRange(
    type: DateRangeType,
    customStart?: Date,
    customEnd?: Date,
  ): void {
    if (type === DateRangeType.CUSTOM) {
      if (!customStart || !customEnd) {
        throw new Error('Custom dates are required for CUSTOM date range type');
      }
      if (customStart > customEnd) {
        throw new Error('Start date must be before end date');
      }
    }

    this.dateRangeType = type;
    this.customStartDate = customStart;
    this.customEndDate = customEnd;
    this.updatedAt = new Date();
  }

  public canExecute(): boolean {
    return this.status === ReportStatus.ACTIVE;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      status: this.status,
      organizationId: this.organizationId,
      createdBy: this.createdBy,
      queryTemplate: this.queryTemplate,
      parameters: this.parameters,
      columns: this.columns,
      filters: this.filters,
      sorting: this.sorting,
      groupBy: this.groupBy,
      dateRangeType: this.dateRangeType,
      customStartDate: this.customStartDate,
      customEndDate: this.customEndDate,
      supportedFormats: this.supportedFormats,
      defaultFormat: this.defaultFormat,
      isScheduled: this.isScheduled,
      scheduleExpression: this.scheduleExpression,
      emailRecipients: this.emailRecipients,
      executionCount: this.executionCount,
      lastExecutedAt: this.lastExecutedAt,
      lastExecutionDurationMs: this.lastExecutionDurationMs,
      layoutConfig: this.layoutConfig,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
