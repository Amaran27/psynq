import { Injectable } from '@nestjs/common';
import {
  CsvExporterPort,
  ReportData,
  ExportOptions,
  ExportResult,
} from '../ports/exporter.port';

@Injectable()
export class CsvWriterExporterAdapter implements CsvExporterPort {
  async export(
    data: ReportData,
    options?: ExportOptions,
  ): Promise<ExportResult> {
    const lines: string[] = [];

    // Header row
    const headers = data.columns.map((col) => this.escapeCsv(col.label));
    lines.push(headers.join(','));

    // Data rows
    data.rows.forEach((row) => {
      const values = data.columns.map((col) => {
        const value = row[col.field];
        return this.escapeCsv(this.formatValue(value, col.type));
      });
      lines.push(values.join(','));
    });

    const csvContent = lines.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      buffer,
      fileName: `${this.sanitizeFileName(data.title)}_${Date.now()}.csv`,
      mimeType: 'text/csv',
      sizeBytes: buffer.length,
    };
  }

  private formatValue(value: any, type: string): string {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'date':
        return value instanceof Date
          ? value.toISOString()
          : String(value);
      case 'number':
        return typeof value === 'number' ? value.toString() : String(value);
      case 'boolean':
        return value ? 'true' : 'false';
      default:
        return String(value);
    }
  }

  private escapeCsv(value: string): string {
    if (!value) return '';

    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      // Escape existing quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }
}
