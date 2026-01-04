/**
 * CDR Controller - REST API
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Header,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ListCDRUseCase } from './application/list-cdr.usecase';
import { GetCDRAnalyticsUseCase } from './application/get-cdr-analytics.usecase';
import { ExportCDRUseCase, ExportFormat } from './application/export-cdr.usecase';

@ApiTags('CDR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cdr')
export class CDRController {
  constructor(
    private readonly listCDRUseCase: ListCDRUseCase,
    private readonly getCDRAnalyticsUseCase: GetCDRAnalyticsUseCase,
    private readonly exportCDRUseCase: ExportCDRUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List CDRs with filters' })
  @ApiQuery({ name: 'src', required: false, description: 'Filter by caller number' })
  @ApiQuery({ name: 'dst', required: false, description: 'Filter by destination number' })
  @ApiQuery({ name: 'disposition', required: false, description: 'Filter by disposition (ANSWERED, NO ANSWER, etc.)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO 8601)' })
  @ApiQuery({ name: 'hasRecording', required: false, description: 'Filter by recording existence (true/false)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 50, max: 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'List of CDRs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listCDRs(
    @Request() req: any,
    @Query('src') src?: string,
    @Query('dst') dst?: string,
    @Query('disposition') disposition?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('hasRecording') hasRecording?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const accountcode = req.user.organizationId;

    const filters = {
      accountcode,
      src,
      dst,
      disposition,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      hasRecording: hasRecording === 'true' ? true : hasRecording === 'false' ? false : undefined,
    };

    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const result = await this.listCDRUseCase.execute(filters, limitNum, offsetNum);

    return {
      data: result.cdrs.map((cdr) => ({
        uniqueid: cdr.uniqueid,
        src: cdr.src,
        dst: cdr.dst,
        start: cdr.start,
        answer: cdr.answer,
        end: cdr.end,
        duration: cdr.duration,
        billsec: cdr.billsec,
        disposition: cdr.disposition,
        hasRecording: cdr.hasRecording(),
        recordingPath: cdr.recordingPath,
      })),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total,
      },
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get CDR analytics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'CDR analytics data' })
  async getCDRAnalytics(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const accountcode = req.user.organizationId;

    const filters = {
      accountcode,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const analytics = await this.getCDRAnalyticsUseCase.execute(filters);

    return {
      totalCalls: analytics.totalCalls,
      answeredCalls: analytics.answeredCalls,
      failedCalls: analytics.failedCalls,
      totalDuration: analytics.totalDuration,
      totalBillsec: analytics.totalBillsec,
      avgDuration: Math.round(analytics.avgDuration),
      avgBillsec: Math.round(analytics.avgBillsec),
      answerRate: Math.round(analytics.answerRate * 100) / 100,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export CDRs as CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format (csv or json)', enum: ['csv', 'json'] })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO 8601)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records to export (default: 1000)' })
  @ApiResponse({ status: 200, description: 'CDR export file' })
  async exportCDRs(
    @Request() req: any,
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const accountcode = req.user.organizationId;

    const filters = {
      accountcode,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const exportFormat: ExportFormat = format === 'json' ? 'json' : 'csv';
    const limitNum = limit ? Math.min(parseInt(limit, 10), 5000) : 1000;

    const result = await this.exportCDRUseCase.execute(filters, exportFormat, limitNum);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }
}
