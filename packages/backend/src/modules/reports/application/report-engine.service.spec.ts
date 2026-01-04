import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportEngineService } from './report-engine.service';
import { REPORT_REPOSITORY_PORT } from '../ports/report-repository.port';
import { PDF_EXPORTER_PORT, CSV_EXPORTER_PORT } from '../ports/exporter.port';
import { ReportTemplate } from '../domain/report-template.domain';
import {
  ReportType,
  ReportStatus,
  ExportFormat,
  DateRangeType,
} from '../../../entities/reports/report-template.entity';
import { CreateReportTemplateDto } from '../dto/create-report-template.dto';
import { UpdateReportTemplateDto } from '../dto/update-report-template.dto';
import { GenerateReportDto } from '../dto/generate-report.dto';
import { DataSource } from 'typeorm';

describe('ReportEngineService', () => {
  let service: ReportEngineService;
  let repository: any;
  let pdfExporter: any;
  let csvExporter: any;
  let dataSource: any;

  const mockTemplateProps = {
    id: 'template-1',
    name: 'Daily CDR Report',
    description: 'Test report',
    type: ReportType.CDR,
    status: ReportStatus.ACTIVE,
    organizationId: 'org-1',
    columns: [
      { field: 'callId', label: 'Call ID', type: 'string' },
      { field: 'duration', label: 'Duration', type: 'number' },
    ],
    dateRangeType: DateRangeType.TODAY,
    supportedFormats: [ExportFormat.PDF, ExportFormat.CSV],
    defaultFormat: ExportFormat.PDF,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByOrganization: jest.fn(),
      findActiveByOrganization: jest.fn(),
      findScheduled: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    pdfExporter = {
      export: jest.fn(),
    };

    csvExporter = {
      export: jest.fn(),
    };

    dataSource = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportEngineService,
        { provide: REPORT_REPOSITORY_PORT, useValue: repository },
        { provide: PDF_EXPORTER_PORT, useValue: pdfExporter },
        { provide: CSV_EXPORTER_PORT, useValue: csvExporter },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ReportEngineService>(ReportEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new report template', async () => {
      // Arrange
      const dto: CreateReportTemplateDto = {
        name: 'Daily CDR Report',
        type: ReportType.CDR,
        columns: [
          { field: 'callId', label: 'Call ID', type: 'string' },
        ] as any,
        dateRangeType: DateRangeType.TODAY,
        supportedFormats: [ExportFormat.PDF],
        defaultFormat: ExportFormat.PDF,
      };

      const mockTemplate = new ReportTemplate({
        ...mockTemplateProps,
        name: dto.name,
      });
      repository.create.mockResolvedValue(mockTemplate);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(repository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
    });

    it('should throw error if validation fails', async () => {
      // Arrange
      const dto: CreateReportTemplateDto = {
        name: '',
        type: ReportType.CDR,
        columns: [{ field: 'callId', label: 'Call ID', type: 'string' }] as any,
        dateRangeType: DateRangeType.TODAY,
        supportedFormats: [ExportFormat.PDF],
        defaultFormat: ExportFormat.PDF,
      };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return a template by ID', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate(mockTemplateProps);
      repository.findById.mockResolvedValue(mockTemplate);

      // Act
      const result = await service.findOne('template-1');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('template-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('template-1');
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      // Arrange
      const templates = [
        new ReportTemplate(mockTemplateProps),
        new ReportTemplate({ ...mockTemplateProps, id: 'template-2' }),
      ];
      repository.findAll.mockResolvedValue(templates);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(repository.findAll).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
    });

    it('should filter by organization', async () => {
      // Arrange
      const template = new ReportTemplate(mockTemplateProps);
      repository.findAll.mockResolvedValue([template]);

      // Act
      const result = await service.findAll({ organizationId: 'org-1' });

      // Assert
      expect(repository.findAll).toHaveBeenCalledWith({ organizationId: 'org-1' });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate(mockTemplateProps);
      repository.findById.mockResolvedValue(mockTemplate);

      const updatedTemplate = new ReportTemplate({
        ...mockTemplateProps,
        name: 'Updated Report',
      });
      repository.update.mockResolvedValue(updatedTemplate);

      const dto: UpdateReportTemplateDto = {
        name: 'Updated Report',
      };

      // Act
      const result = await service.update('template-1', dto);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('template-1');
      expect(repository.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Report');
    });

    it('should throw NotFoundException if template not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a non-scheduled template', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate({
        ...mockTemplateProps,
        isScheduled: false,
      });
      repository.findById.mockResolvedValue(mockTemplate);
      repository.delete.mockResolvedValue(undefined);

      // Act
      await service.remove('template-1');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('template-1');
      expect(repository.delete).toHaveBeenCalledWith('template-1');
    });

    it('should throw error if template is scheduled', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate({
        ...mockTemplateProps,
        isScheduled: true,
        scheduleExpression: '0 9 * * *',
      });
      repository.findById.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(service.remove('template-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('should activate a draft template', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate({
        ...mockTemplateProps,
        status: ReportStatus.DRAFT,
      });
      repository.findById.mockResolvedValue(mockTemplate);
      repository.update.mockImplementation((t) => Promise.resolve(t));

      // Act
      const result = await service.activate('template-1');

      // Assert
      expect(result.status).toBe(ReportStatus.ACTIVE);
      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('should archive an active template', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate({
        ...mockTemplateProps,
        status: ReportStatus.ACTIVE,
        isScheduled: false,
      });
      repository.findById.mockResolvedValue(mockTemplate);
      repository.update.mockImplementation((t) => Promise.resolve(t));

      // Act
      const result = await service.archive('template-1');

      // Assert
      expect(result.status).toBe(ReportStatus.ARCHIVED);
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw error if template is scheduled', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate({
        ...mockTemplateProps,
        isScheduled: true,
        scheduleExpression: '0 9 * * *',
      });
      repository.findById.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(service.archive('template-1')).rejects.toThrow();
    });
  });

  describe('enableScheduling', () => {
    it('should enable scheduling for active template', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate(mockTemplateProps);
      repository.findById.mockResolvedValue(mockTemplate);
      repository.update.mockImplementation((t) => Promise.resolve(t));

      // Act
      const result = await service.enableScheduling(
        'template-1',
        '0 9 * * *',
        ['admin@example.com'],
      );

      // Assert
      expect(result.isScheduled).toBe(true);
      expect(result.scheduleExpression).toBe('0 9 * * *');
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw error if template is not active', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate({
        ...mockTemplateProps,
        status: ReportStatus.DRAFT,
      });
      repository.findById.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(
        service.enableScheduling('template-1', '0 9 * * *'),
      ).rejects.toThrow();
    });
  });

  describe('generateReport', () => {
    it('should generate PDF report', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate(mockTemplateProps);
      repository.findById.mockResolvedValue(mockTemplate);
      repository.update.mockImplementation((t) => Promise.resolve(t));

      const mockResult = {
        buffer: Buffer.from('pdf data'),
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      };
      pdfExporter.export.mockResolvedValue(mockResult);

      dataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            { callId: '123', duration: 60 },
          ]),
        }),
      });

      const dto: GenerateReportDto = {
        templateId: 'template-1',
        format: ExportFormat.PDF,
      };

      // Act
      const result = await service.generateReport(dto);

      // Assert
      expect(pdfExporter.export).toHaveBeenCalled();
      expect(result.fileName).toBe('report.pdf');
      expect(repository.update).toHaveBeenCalled(); // Record execution
    });

    it('should generate CSV report', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate(mockTemplateProps);
      repository.findById.mockResolvedValue(mockTemplate);
      repository.update.mockImplementation((t) => Promise.resolve(t));

      const mockResult = {
        buffer: Buffer.from('csv data'),
        fileName: 'report.csv',
        mimeType: 'text/csv',
        sizeBytes: 512,
      };
      csvExporter.export.mockResolvedValue(mockResult);

      dataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            { callId: '123', duration: 60 },
          ]),
        }),
      });

      const dto: GenerateReportDto = {
        templateId: 'template-1',
        format: ExportFormat.CSV,
      };

      // Act
      const result = await service.generateReport(dto);

      // Assert
      expect(csvExporter.export).toHaveBeenCalled();
      expect(result.fileName).toBe('report.csv');
    });

    it('should throw error if template is not active', async () => {
      // Arrange
      const mockTemplate = new ReportTemplate({
        ...mockTemplateProps,
        status: ReportStatus.DRAFT,
      });
      repository.findById.mockResolvedValue(mockTemplate);

      const dto: GenerateReportDto = {
        templateId: 'template-1',
        format: ExportFormat.PDF,
      };

      // Act & Assert
      await expect(service.generateReport(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return report statistics', async () => {
      // Arrange
      repository.count.mockResolvedValue(5);
      repository.findAll.mockResolvedValue([
        new ReportTemplate(mockTemplateProps),
        new ReportTemplate({
          ...mockTemplateProps,
          id: 'template-2',
          status: ReportStatus.DRAFT,
        }),
        new ReportTemplate({
          ...mockTemplateProps,
          id: 'template-3',
          type: ReportType.CAMPAIGN_SUMMARY,
        }),
      ]);

      // Act
      const result = await service.getStatistics({});

      // Assert
      expect(result.total).toBe(5);
      expect(result.byStatus).toBeDefined();
      expect(result.byType).toBeDefined();
      expect(result.byType[ReportType.CDR]).toBe(2);
      expect(result.byType[ReportType.CAMPAIGN_SUMMARY]).toBe(1);
    });
  });
});
