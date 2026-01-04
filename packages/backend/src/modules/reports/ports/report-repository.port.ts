import { ReportTemplate } from '../domain/report-template.domain';
import { ReportStatus, ReportType } from '../../../entities/reports/report-template.entity';

export const REPORT_REPOSITORY_PORT = Symbol('REPORT_REPOSITORY_PORT');

export interface FindReportTemplatesFilter {
  organizationId?: string;
  status?: ReportStatus;
  type?: ReportType;
  createdBy?: string;
}

export interface ReportRepositoryPort {
  create(template: ReportTemplate): Promise<ReportTemplate>;
  findById(id: string): Promise<ReportTemplate | null>;
  findAll(filter: FindReportTemplatesFilter): Promise<ReportTemplate[]>;
  findByOrganization(organizationId: string): Promise<ReportTemplate[]>;
  findActiveByOrganization(organizationId: string): Promise<ReportTemplate[]>;
  findScheduled(): Promise<ReportTemplate[]>;
  update(template: ReportTemplate): Promise<ReportTemplate>;
  delete(id: string): Promise<void>;
  count(filter: FindReportTemplatesFilter): Promise<number>;
}
