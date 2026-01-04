import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportTemplateEntity } from '../../entities/reports/report-template.entity';
import { ReportExecutionEntity } from '../../entities/reports/report-execution.entity';
import { ReportEngineController } from './report-engine.controller';
import { ReportEngineService } from './application/report-engine.service';
import { TypeOrmReportRepositoryAdapter } from './adapters/typeorm-report-repository.adapter';
import { PdfKitExporterAdapter } from './adapters/pdfkit-exporter.adapter';
import { CsvWriterExporterAdapter } from './adapters/csv-writer-exporter.adapter';
import {
  REPORT_REPOSITORY_PORT,
} from './ports/report-repository.port';
import {
  PDF_EXPORTER_PORT,
  CSV_EXPORTER_PORT,
} from './ports/exporter.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTemplateEntity, ReportExecutionEntity]),
  ],
  controllers: [ReportEngineController],
  providers: [
    ReportEngineService,
    {
      provide: REPORT_REPOSITORY_PORT,
      useClass: TypeOrmReportRepositoryAdapter,
    },
    {
      provide: PDF_EXPORTER_PORT,
      useClass: PdfKitExporterAdapter,
    },
    {
      provide: CSV_EXPORTER_PORT,
      useClass: CsvWriterExporterAdapter,
    },
  ],
  exports: [ReportEngineService],
})
export class ReportsModule {}
