/**
 * Export CDR Use Case
 */

import { Injectable, Inject } from '@nestjs/common';
import { CDRRepositoryPort, CDRSearchFilters } from '../ports/cdr-repository.port';
import { CDR } from '../domain/cdr.entity';

export type ExportFormat = 'csv' | 'json';

export interface ExportCDRResult {
  data: string;
  filename: string;
  contentType: string;
}

@Injectable()
export class ExportCDRUseCase {
  constructor(
    @Inject('CDR_REPOSITORY')
    private readonly cdrRepository: CDRRepositoryPort,
  ) {}

  async execute(
    filters: CDRSearchFilters,
    format: ExportFormat = 'csv',
    limit: number = 1000,
  ): Promise<ExportCDRResult> {
    const cdrs = await this.cdrRepository.find(filters, limit, 0);

    if (format === 'json') {
      return {
        data: JSON.stringify(cdrs, null, 2),
        filename: `cdr-export-${Date.now()}.json`,
        contentType: 'application/json',
      };
    }

    // CSV export - build manually without external library
    const headers = [
      'uniqueid',
      'src',
      'dst',
      'start',
      'answer',
      'end',
      'duration',
      'billsec',
      'disposition',
      'accountcode',
      'recordingPath',
    ];

    const rows = cdrs.map((cdr) => [
      this.escapeCsvField(cdr.uniqueid),
      this.escapeCsvField(cdr.src),
      this.escapeCsvField(cdr.dst),
      cdr.start.toISOString(),
      cdr.answer?.toISOString() || '',
      cdr.end.toISOString(),
      cdr.duration?.toString() || '0',
      cdr.billsec?.toString() || '0',
      this.escapeCsvField(cdr.disposition),
      this.escapeCsvField(cdr.accountcode),
      this.escapeCsvField(cdr.recordingPath || ''),
    ]);

    const csvLines = [headers.join(','), ...rows.map((row) => row.join(','))];
    const csvData = csvLines.join('\n');

    return {
      data: csvData,
      filename: `cdr-export-${Date.now()}.csv`,
      contentType: 'text/csv',
    };
  }

  /**
   * Escape CSV field (handle quotes, commas, newlines)
   */
  private escapeCsvField(value: string | null | undefined): string {
    if (!value) return '';

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }
}
