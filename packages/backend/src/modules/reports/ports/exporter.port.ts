export const PDF_EXPORTER_PORT = Symbol('PDF_EXPORTER_PORT');
export const CSV_EXPORTER_PORT = Symbol('CSV_EXPORTER_PORT');

export interface ReportData {
  title: string;
  generatedAt: Date;
  parameters?: Record<string, any>;
  columns: Array<{
    field: string;
    label: string;
    type: string;
  }>;
  rows: Record<string, any>[];
  totalRows: number;
  metadata?: {
    organizationName?: string;
    dateRange?: string;
    filters?: string;
  };
}

export interface ExportOptions {
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter' | 'Legal';
  includeHeader?: boolean;
  includeFooter?: boolean;
  includeChart?: boolean;
}

export interface ExportResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PdfExporterPort {
  export(data: ReportData, options?: ExportOptions): Promise<ExportResult>;
}

export interface CsvExporterPort {
  export(data: ReportData, options?: ExportOptions): Promise<ExportResult>;
}
