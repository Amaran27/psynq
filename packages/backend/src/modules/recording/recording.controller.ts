/**
 * Recording Controller - REST API
 */

import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetRecordingUseCase } from './application/get-recording.usecase';
import { ListRecordingsUseCase } from './application/list-recordings.usecase';
import { DeleteRecordingUseCase } from './application/delete-recording.usecase';

@ApiTags('Recordings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recordings')
export class RecordingController {
  constructor(
    private readonly getRecordingUseCase: GetRecordingUseCase,
    private readonly listRecordingsUseCase: ListRecordingsUseCase,
    private readonly deleteRecordingUseCase: DeleteRecordingUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List recordings with filters' })
  @ApiQuery({ name: 'callId', required: false, description: 'Filter by call ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (available, deleted)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO 8601)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 50, max: 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'List of recordings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listRecordings(
    @Request() req: any,
    @Query('callId') callId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const organizationId = req.user.organizationId;

    const filters = {
      organizationId,
      callId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const result = await this.listRecordingsUseCase.execute(filters, limitNum, offsetNum);

    return {
      data: result.recordings.map((r) => ({
        id: r.id,
        callId: r.callId,
        fileName: r.fileName,
        format: r.format,
        duration: r.duration,
        size: r.size,
        status: r.status,
        uploadedAt: r.uploadedAt,
        createdAt: r.createdAt,
      })),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recording by ID with download URL' })
  @ApiParam({ name: 'id', description: 'Recording ID' })
  @ApiResponse({ status: 200, description: 'Recording details with download URL' })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async getRecording(@Param('id') id: string, @Request() req: any) {
    const result = await this.getRecordingUseCase.execute(id, true);

    // Verify user has access to this recording
    if (result.recording.organizationId !== req.user.organizationId) {
      throw new NotFoundException(`Recording ${id} not found`);
    }

    return {
      id: result.recording.id,
      callId: result.recording.callId,
      fileName: result.recording.fileName,
      format: result.recording.format,
      duration: result.recording.duration,
      size: result.recording.size,
      status: result.recording.status,
      metadata: result.recording.metadata,
      uploadedAt: result.recording.uploadedAt,
      createdAt: result.recording.createdAt,
      downloadUrl: result.url,
      downloadUrlExpiresIn: 3600, // 1 hour
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete recording (soft delete)' })
  @ApiParam({ name: 'id', description: 'Recording ID' })
  @ApiQuery({ name: 'hard', required: false, description: 'Permanently delete (true/false)' })
  @ApiResponse({ status: 204, description: 'Recording deleted' })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async deleteRecording(
    @Param('id') id: string,
    @Query('hard') hard?: string,
    @Request() req?: any,
  ) {
    // Verify user has access to this recording
    const result = await this.getRecordingUseCase.execute(id, false);
    if (result.recording.organizationId !== req.user.organizationId) {
      throw new NotFoundException(`Recording ${id} not found`);
    }

    const hardDelete = hard === 'true';
    await this.deleteRecordingUseCase.execute(id, hardDelete);
  }
}
