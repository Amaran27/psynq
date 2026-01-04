import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  PdfExporterPort,
  ReportData,
  ExportOptions,
  ExportResult,
} from '../ports/exporter.port';

@Injectable()
export class PdfKitExporterAdapter implements PdfExporterPort {
  async export(
    data: ReportData,
    options?: ExportOptions,
  ): Promise<ExportResult> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options?.pageSize || 'A4',
          layout: options?.orientation || 'portrait',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(buffers);
          resolve({
            buffer,
            fileName: `${this.sanitizeFileName(data.title)}_${Date.now()}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: buffer.length,
          });
        });
        doc.on('error', reject);

        // Header
        if (options?.includeHeader !== false) {
          doc.fontSize(20).text(data.title, { align: 'center' });
          doc.moveDown();

          doc.fontSize(10).text(`Generated: ${data.generatedAt.toLocaleString()}`, {
            align: 'right',
          });

          if (data.metadata?.organizationName) {
            doc.text(`Organization: ${data.metadata.organizationName}`, {
              align: 'left',
            });
          }

          if (data.metadata?.dateRange) {
            doc.text(`Date Range: ${data.metadata.dateRange}`, {
              align: 'left',
            });
          }

          doc.moveDown();
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown();
        }

        // Table
        const columnWidth = 500 / data.columns.length;
        const startY = doc.y;

        // Table headers
        doc.fontSize(10).fillColor('#000000');
        data.columns.forEach((col, index) => {
          doc.text(col.label, 50 + index * columnWidth, startY, {
            width: columnWidth,
            align: 'left',
          });
        });

        doc.moveDown();
        let currentY = doc.y;

        // Table rows
        doc.fontSize(9);
        data.rows.slice(0, 50).forEach((row, rowIndex) => {
          // Limit to 50 rows for demo
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;

            // Reprint headers on new page
            doc.fontSize(10);
            data.columns.forEach((col, index) => {
              doc.text(col.label, 50 + index * columnWidth, currentY, {
                width: columnWidth,
                align: 'left',
              });
            });
            doc.moveDown();
            currentY = doc.y;
            doc.fontSize(9);
          }

          data.columns.forEach((col, index) => {
            const value = row[col.field];
            const displayValue = this.formatValue(value, col.type);

            doc.text(displayValue, 50 + index * columnWidth, currentY, {
              width: columnWidth,
              align: col.type === 'number' ? 'right' : 'left',
              continued: index < data.columns.length - 1,
            });
          });

          currentY += 20;
        });

        // Footer
        if (options?.includeFooter !== false) {
          doc.moveDown(2);
          doc
            .fontSize(8)
            .text(`Total Rows: ${data.totalRows}`, { align: 'center' });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private formatValue(value: any, type: string): string {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'date':
        return value instanceof Date
          ? value.toLocaleDateString()
          : String(value);
      case 'number':
        return typeof value === 'number' ? value.toFixed(2) : String(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }
}
