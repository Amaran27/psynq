import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  REPORT_REPOSITORY_PORT,
  ReportRepositoryPort,
  FindReportTemplatesFilter,
} from '../ports/report-repository.port';
import {
  PDF_EXPORTER_PORT,
  CSV_EXPORTER_PORT,
  PdfExporterPort,
  CsvExporterPort,
  ReportData,
  ExportResult,
} from '../ports/exporter.port';
import { ReportTemplate } from '../domain/report-template.domain';
import { CreateReportTemplateDto } from '../dto/create-report-template.dto';
import { UpdateReportTemplateDto } from '../dto/update-report-template.dto';
import { GenerateReportDto } from '../dto/generate-report.dto';
import {
  ExportFormat,
  ReportType,
  DateRangeType,
} from '../../../entities/reports/report-template.entity';

@Injectable()
export class ReportEngineService {
  constructor(
    @Inject(REPORT_REPOSITORY_PORT)
    private readonly repository: ReportRepositoryPort,
    @Inject(PDF_EXPORTER_PORT)
    private readonly pdfExporter: PdfExporterPort,
    @Inject(CSV_EXPORTER_PORT)
    private readonly csvExporter: CsvExporterPort,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateReportTemplateDto): Promise<ReportTemplate> {
    const template = new ReportTemplate({
      name: dto.name,
      description: dto.description,
      type: dto.type,
      status: dto.status || ('DRAFT' as any),
      organizationId: dto.organizationId || 'default-org',
      createdBy: dto.createdBy,
      queryTemplate: dto.queryTemplate,
      parameters: dto.parameters,
      columns: dto.columns as any,
      filters: dto.filters as any,
      sorting: dto.sorting as any,
      groupBy: dto.groupBy,
      dateRangeType: dto.dateRangeType,
      customStartDate: dto.customStartDate
        ? new Date(dto.customStartDate)
        : undefined,
      customEndDate: dto.customEndDate ? new Date(dto.customEndDate) : undefined,
      supportedFormats: dto.supportedFormats,
      defaultFormat: dto.defaultFormat,
      isScheduled: dto.isScheduled,
      scheduleExpression: dto.scheduleExpression,
      emailRecipients: dto.emailRecipients,
      layoutConfig: dto.layoutConfig as any,
    });

    return await this.repository.create(template);
  }

  async findOne(id: string): Promise<ReportTemplate> {
    const template = await this.repository.findById(id);
    if (!template) {
      throw new NotFoundException(`Report template with ID ${id} not found`);
    }
    return template;
  }

  async findAll(filter: FindReportTemplatesFilter): Promise<ReportTemplate[]> {
    return await this.repository.findAll(filter);
  }

  async findByOrganization(organizationId: string): Promise<ReportTemplate[]> {
    return await this.repository.findByOrganization(organizationId);
  }

  async findActiveByOrganization(
    organizationId: string,
  ): Promise<ReportTemplate[]> {
    return await this.repository.findActiveByOrganization(organizationId);
  }

  async update(
    id: string,
    dto: UpdateReportTemplateDto,
  ): Promise<ReportTemplate> {
    const existing = await this.findOne(id);

    // Create updated template with merged data
    const updated = new ReportTemplate({
      ...existing,
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description,
      type: dto.type ?? existing.type,
      status: dto.status ?? existing.status,
      queryTemplate: dto.queryTemplate ?? existing.queryTemplate,
      parameters: dto.parameters ?? existing.parameters,
      columns: (dto.columns as any) ?? existing.columns,
      filters: (dto.filters as any) ?? existing.filters,
      sorting: (dto.sorting as any) ?? existing.sorting,
      groupBy: dto.groupBy ?? existing.groupBy,
      dateRangeType: dto.dateRangeType ?? existing.dateRangeType,
      customStartDate: dto.customStartDate
        ? new Date(dto.customStartDate)
        : existing.customStartDate,
      customEndDate: dto.customEndDate
        ? new Date(dto.customEndDate)
        : existing.customEndDate,
      supportedFormats: dto.supportedFormats ?? existing.supportedFormats,
      defaultFormat: dto.defaultFormat ?? existing.defaultFormat,
      isScheduled: dto.isScheduled ?? existing.isScheduled,
      scheduleExpression: dto.scheduleExpression ?? existing.scheduleExpression,
      emailRecipients: dto.emailRecipients ?? existing.emailRecipients,
      layoutConfig: (dto.layoutConfig as any) ?? existing.layoutConfig,
    });

    return await this.repository.update(updated);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.isScheduled) {
      throw new BadRequestException(
        'Cannot delete a scheduled report. Disable scheduling first.',
      );
    }

    await this.repository.delete(id);
  }

  async activate(id: string): Promise<ReportTemplate> {
    const template = await this.findOne(id);
    template.activate();
    return await this.repository.update(template);
  }

  async archive(id: string): Promise<ReportTemplate> {
    const template = await this.findOne(id);
    template.archive();
    return await this.repository.update(template);
  }

  async draft(id: string): Promise<ReportTemplate> {
    const template = await this.findOne(id);
    template.draft();
    return await this.repository.update(template);
  }

  async enableScheduling(
    id: string,
    cronExpression: string,
    recipients?: string[],
  ): Promise<ReportTemplate> {
    const template = await this.findOne(id);
    template.enableScheduling(cronExpression, recipients);
    return await this.repository.update(template);
  }

  async disableScheduling(id: string): Promise<ReportTemplate> {
    const template = await this.findOne(id);
    template.disableScheduling();
    return await this.repository.update(template);
  }

  async generateReport(dto: GenerateReportDto): Promise<ExportResult> {
    const template = await this.findOne(dto.templateId);

    if (!template.canExecute()) {
      throw new BadRequestException('Only active reports can be executed');
    }

    const startTime = Date.now();

    // Fetch report data
    const data = await this.fetchReportData(
      template,
      dto.parameters || template.parameters,
    );

    // Export to requested format
    let result: ExportResult;
    switch (dto.format) {
      case ExportFormat.PDF:
        result = await this.pdfExporter.export(data, {
          orientation: template.layoutConfig?.orientation,
          pageSize: template.layoutConfig?.pageSize,
          includeHeader: true,
          includeFooter: true,
        });
        break;
      case ExportFormat.CSV:
        result = await this.csvExporter.export(data);
        break;
      default:
        throw new BadRequestException(`Unsupported format: ${dto.format}`);
    }

    // Record execution
    const durationMs = Date.now() - startTime;
    template.recordExecution(durationMs);
    await this.repository.update(template);

    return result;
  }

  private async fetchReportData(
    template: ReportTemplate,
    parameters?: Record<string, any>,
  ): Promise<ReportData> {
    let rows: any[] = [];

    // Get date range
    const { startDate, endDate } = this.calculateDateRange(template);

    // Execute query based on report type
    switch (template.type) {
      case ReportType.CDR:
        rows = await this.fetchCdrData(
          template,
          startDate,
          endDate,
          parameters,
        );
        break;
      case ReportType.CAMPAIGN_SUMMARY:
        rows = await this.fetchCampaignSummary(
          template,
          startDate,
          endDate,
          parameters,
        );
        break;
      case ReportType.AGENT_PERFORMANCE:
        rows = await this.fetchAgentPerformance(
          template,
          startDate,
          endDate,
          parameters,
        );
        break;
      case ReportType.CUSTOM:
        if (!template.queryTemplate) {
          throw new BadRequestException('Custom reports require a query template');
        }
        rows = await this.executeCustomQuery(
          template.queryTemplate,
          { ...parameters, startDate, endDate },
        );
        break;
      default:
        throw new BadRequestException(`Unsupported report type: ${template.type}`);
    }

    return {
      title: template.name,
      generatedAt: new Date(),
      parameters,
      columns: template.columns,
      rows,
      totalRows: rows.length,
      metadata: {
        dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      },
    };
  }

  private calculateDateRange(template: ReportTemplate): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (template.dateRangeType) {
      case DateRangeType.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case DateRangeType.YESTERDAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case DateRangeType.LAST_7_DAYS:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case DateRangeType.LAST_30_DAYS:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case DateRangeType.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case DateRangeType.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case DateRangeType.CUSTOM:
        startDate = template.customStartDate!;
        endDate = template.customEndDate!;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private async fetchCdrData(
    template: ReportTemplate,
    startDate: Date,
    endDate: Date,
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    const query = this.dataSource
      .getRepository('CdrEntity')
      .createQueryBuilder('cdr')
      .where('cdr.startTime >= :startDate', { startDate })
      .andWhere('cdr.startTime <= :endDate', { endDate });

    if (parameters?.campaignId) {
      query.andWhere('cdr.campaignId = :campaignId', {
        campaignId: parameters.campaignId,
      });
    }

    // Apply filters from template
    template.filters?.forEach((filter) => {
      query.andWhere(`cdr.${filter.field} ${filter.operator} :value`, {
        value: filter.value,
      });
    });

    // Apply sorting
    template.sorting?.forEach((sort) => {
      query.addOrderBy(`cdr.${sort.field}`, sort.direction);
    });

    return await query.limit(10000).getMany(); // Limit for safety
  }

  private async fetchCampaignSummary(
    template: ReportTemplate,
    startDate: Date,
    endDate: Date,
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    const query = `
      SELECT 
        c.id as campaignId,
        c.name as campaignName,
        COUNT(cdr.id) as totalCalls,
        SUM(CASE WHEN cdr.disposition = 'ANSWERED' THEN 1 ELSE 0 END) as answeredCalls,
        AVG(cdr.duration) as avgDuration
      FROM campaigns c
      LEFT JOIN cdr ON cdr."campaignId" = c.id
      WHERE cdr."startTime" >= $1 AND cdr."startTime" <= $2
      GROUP BY c.id, c.name
      ORDER BY totalCalls DESC
    `;

    const result = await this.dataSource.query(query, [startDate, endDate]);
    return result;
  }

  private async fetchAgentPerformance(
    template: ReportTemplate,
    startDate: Date,
    endDate: Date,
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    const query = `
      SELECT 
        u.id as agentId,
        u.email as agentEmail,
        COUNT(cdr.id) as totalCalls,
        SUM(cdr.duration) as totalTalkTime,
        AVG(cdr.duration) as avgCallDuration
      FROM users u
      LEFT JOIN cdr ON cdr."userId" = u.id
      WHERE cdr."startTime" >= $1 AND cdr."startTime" <= $2
      GROUP BY u.id, u.email
      ORDER BY totalCalls DESC
    `;

    const result = await this.dataSource.query(query, [startDate, endDate]);
    return result;
  }

  private async executeCustomQuery(
    queryTemplate: string,
    parameters: Record<string, any>,
  ): Promise<any[]> {
    // Replace parameters in query template
    let query = queryTemplate;
    const paramValues: any[] = [];
    let paramIndex = 1;

    Object.keys(parameters).forEach((key) => {
      const placeholder = `$${paramIndex}`;
      query = query.replace(new RegExp(`:${key}`, 'g'), placeholder);
      paramValues.push(parameters[key]);
      paramIndex++;
    });

    return await this.dataSource.query(query, paramValues);
  }

  async getStatistics(filter: FindReportTemplatesFilter): Promise<any> {
    const total = await this.repository.count(filter);
    const templates = await this.repository.findAll(filter);

    return {
      total,
      byStatus: {
        DRAFT: templates.filter((t) => t.status === 'DRAFT').length,
        ACTIVE: templates.filter((t) => t.status === 'ACTIVE').length,
        ARCHIVED: templates.filter((t) => t.status === 'ARCHIVED').length,
      },
      byType: {
        CDR: templates.filter((t) => t.type === ReportType.CDR).length,
        CAMPAIGN_SUMMARY: templates.filter((t) => t.type === ReportType.CAMPAIGN_SUMMARY).length,
        AGENT_PERFORMANCE: templates.filter((t) => t.type === ReportType.AGENT_PERFORMANCE).length,
        CUSTOM: templates.filter((t) => t.type === ReportType.CUSTOM).length,
      },
      scheduled: templates.filter((t) => t.isScheduled).length,
      totalExecutions: templates.reduce(
        (sum, t) => sum + t.executionCount,
        0,
      ),
    };
  }
}
