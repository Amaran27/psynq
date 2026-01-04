import { DataSource } from 'typeorm';
import { ReportTemplateEntity, ReportType, ReportStatus, ExportFormat, DateRangeType } from '../entities/reports/report-template.entity';

export async function seedReportTemplates(dataSource: DataSource) {
  const repository = dataSource.getRepository(ReportTemplateEntity);

  // Get first organization
  const organizations = await dataSource.query('SELECT id FROM organizations LIMIT 1');
  if (!organizations || organizations.length === 0) {
    console.log('No organizations found. Skipping report template seeding.');
    return;
  }

  const organizationId = organizations[0].id;

  const templates = [
    {
      name: 'Daily CDR Report',
      description: 'Complete call detail records for the current day',
      type: ReportType.CDR,
      status: ReportStatus.ACTIVE,
      organizationId,
      columns: [
        { field: 'callId', label: 'Call ID', type: 'string' },
        { field: 'startTime', label: 'Start Time', type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        { field: 'duration', label: 'Duration (s)', type: 'number', format: '0.00' },
        { field: 'disposition', label: 'Disposition', type: 'string' },
        { field: 'src', label: 'Source', type: 'string' },
        { field: 'dst', label: 'Destination', type: 'string' },
      ],
      filters: [],
      sorting: [{ field: 'startTime', direction: 'DESC' }],
      dateRangeType: DateRangeType.TODAY,
      supportedFormats: [ExportFormat.PDF, ExportFormat.CSV],
      defaultFormat: ExportFormat.PDF,
      layoutConfig: {
        orientation: 'landscape',
        pageSize: 'A4',
        includeChart: false,
      },
    },
    {
      name: 'Weekly Campaign Performance',
      description: 'Campaign summary for the last 7 days',
      type: ReportType.CAMPAIGN_SUMMARY,
      status: ReportStatus.ACTIVE,
      organizationId,
      columns: [
        { field: 'campaignName', label: 'Campaign', type: 'string' },
        { field: 'totalCalls', label: 'Total Calls', type: 'number', aggregate: 'COUNT' },
        { field: 'answeredCalls', label: 'Answered', type: 'number', aggregate: 'SUM' },
        { field: 'avgDuration', label: 'Avg Duration (s)', type: 'number', format: '0.00', aggregate: 'AVG' },
      ],
      filters: [],
      sorting: [{ field: 'totalCalls', direction: 'DESC' }],
      groupBy: ['campaignName'],
      dateRangeType: DateRangeType.LAST_7_DAYS,
      supportedFormats: [ExportFormat.PDF, ExportFormat.CSV, ExportFormat.EXCEL],
      defaultFormat: ExportFormat.CSV,
      layoutConfig: {
        orientation: 'portrait',
        pageSize: 'A4',
        includeChart: true,
        chartType: 'bar',
      },
    },
    {
      name: 'Monthly Agent Performance',
      description: 'Agent metrics for the current month',
      type: ReportType.AGENT_PERFORMANCE,
      status: ReportStatus.ACTIVE,
      organizationId,
      columns: [
        { field: 'agentEmail', label: 'Agent', type: 'string' },
        { field: 'totalCalls', label: 'Total Calls', type: 'number', aggregate: 'COUNT' },
        { field: 'totalTalkTime', label: 'Talk Time (s)', type: 'number', aggregate: 'SUM' },
        { field: 'avgCallDuration', label: 'Avg Call (s)', type: 'number', format: '0.00', aggregate: 'AVG' },
      ],
      filters: [],
      sorting: [{ field: 'totalCalls', direction: 'DESC' }],
      groupBy: ['agentEmail'],
      dateRangeType: DateRangeType.THIS_MONTH,
      supportedFormats: [ExportFormat.PDF, ExportFormat.CSV],
      defaultFormat: ExportFormat.PDF,
      layoutConfig: {
        orientation: 'portrait',
        pageSize: 'Letter',
        includeChart: true,
        chartType: 'pie',
      },
    },
    {
      name: 'Custom Date Range Report',
      description: 'Template for custom date range reports',
      type: ReportType.CUSTOM,
      status: ReportStatus.DRAFT,
      organizationId,
      queryTemplate: 'SELECT * FROM cdr WHERE "startTime" >= :startDate AND "startTime" <= :endDate',
      parameters: {},
      columns: [
        { field: 'callId', label: 'Call ID', type: 'string' },
        { field: 'startTime', label: 'Start Time', type: 'date' },
        { field: 'duration', label: 'Duration', type: 'number' },
        { field: 'disposition', label: 'Disposition', type: 'string' },
      ],
      filters: [],
      sorting: [{ field: 'startTime', direction: 'ASC' }],
      dateRangeType: DateRangeType.CUSTOM,
      customStartDate: new Date('2024-01-01'),
      customEndDate: new Date('2024-01-31'),
      supportedFormats: [ExportFormat.PDF, ExportFormat.CSV, ExportFormat.JSON],
      defaultFormat: ExportFormat.CSV,
    },
  ];

  for (const templateData of templates) {
    const existing = await repository.findOne({
      where: { name: templateData.name, organizationId },
    });

    if (!existing) {
      const template = repository.create(templateData as any);
      await repository.save(template);
      console.log(`✓ Created report template: ${templateData.name}`);
    } else {
      console.log(`- Report template already exists: ${templateData.name}`);
    }
  }

  console.log('Report template seeding completed.');
}

// Run if executed directly
if (require.main === module) {
  import('../data-source').then(async (module) => {
    const dataSource = module.default || module;
    if (dataSource && typeof dataSource.initialize === 'function') {
      await dataSource.initialize();
      await seedReportTemplates(dataSource);
      await dataSource.destroy();
    }
  });
}
