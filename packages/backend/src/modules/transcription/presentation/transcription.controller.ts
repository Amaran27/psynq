import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { TranscriptionService } from '../application/transcription.service';
import { CreateTranscriptionDto, UpdateTranscriptionDto, ProcessTranscriptionDto } from '../dto';

@ApiTags('transcriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transcriptions')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transcription job' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Transcription created' })
  async create(@Request() req, @Body() dto: CreateTranscriptionDto) {
    dto.organizationId = req.user.organizationId;
    return this.transcriptionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transcriptions with filters' })
  @ApiQuery({ name: 'callId', required: false })
  @ApiQuery({ name: 'recordingId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'provider', required: false })
  async findAll(@Request() req, @Query() query: any) {
    const filter = {
      organizationId: req.user.organizationId,
      ...query,
    };
    return this.transcriptionService.findAll(filter);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending transcriptions (for job processing)' })
  async findPending() {
    return this.transcriptionService.findPending();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get transcription statistics' })
  async getStatistics(@Request() req) {
    return this.transcriptionService.getTranscriptionStats(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transcription by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transcription found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Transcription not found' })
  async findById(@Param('id') id: string) {
    return this.transcriptionService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transcription' })
  async update(@Param('id') id: string, @Body() dto: UpdateTranscriptionDto) {
    return this.transcriptionService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transcription' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async delete(@Param('id') id: string) {
    await this.transcriptionService.delete(id);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Trigger transcription processing' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Processing started' })
  async process(@Param('id') id: string, @Body() dto?: ProcessTranscriptionDto) {
    return this.transcriptionService.processTranscription(id, dto?.provider);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed transcription' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Retry initiated' })
  async retry(@Param('id') id: string, @Body() dto?: ProcessTranscriptionDto) {
    return this.transcriptionService.retry(id, dto?.provider);
  }

  @Get(':id/segments')
  @ApiOperation({ summary: 'Get transcription segments' })
  async getSegments(@Param('id') id: string) {
    return this.transcriptionService.getSegments(id);
  }

  @Get(':id/segments/timerange')
  @ApiOperation({ summary: 'Get segments in time range' })
  @ApiQuery({ name: 'start', required: true })
  @ApiQuery({ name: 'end', required: true })
  async getSegmentsByTimeRange(
    @Param('id') id: string,
    @Query('start') start: number,
    @Query('end') end: number,
  ) {
    return this.transcriptionService.getSegmentsByTimeRange(id, start, end);
  }

  @Get(':id/segments/speaker/:speaker')
  @ApiOperation({ summary: 'Get segments by speaker' })
  async getSegmentsBySpeaker(@Param('id') id: string, @Param('speaker') speaker: string) {
    return this.transcriptionService.getSegmentsBySpeaker(id, speaker);
  }
}
