/**
 * PacingEngine Controller (Hexagonal Architecture)
 * 
 * REST API endpoints for pacing engine management
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PacingEngineService, PacingEngineListQuery } from './application/pacing-engine.service';
import { CreatePacingEngineDto } from './dto/create-pacing-engine.dto';
import { UpdatePacingEngineDto } from './dto/update-pacing-engine.dto';
import { PacingStatus } from '../../entities/dialer/pacing-engine.entity';

@ApiTags('Dialer - Pacing Engine')
@Controller('api/v1/dialer/pacing-engines')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PacingEngineController {
  constructor(private readonly pacingEngineService: PacingEngineService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new pacing engine',
    description: 'Creates a new pacing engine configuration for predictive dialing',
  })
  @ApiResponse({
    status: 201,
    description: 'Pacing engine created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  create(@Body() createDto: CreatePacingEngineDto) {
    return this.pacingEngineService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all pacing engines',
    description: 'Retrieves all pacing engines with optional filtering',
  })
  @ApiQuery({
    name: 'campaignId',
    required: false,
    description: 'Filter by campaign ID',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    description: 'Filter by session ID',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Filter by organization ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PacingStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of results to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engines retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findAll(@Query() query: PacingEngineListQuery) {
    return this.pacingEngineService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get pacing engine statistics',
    description: 'Retrieves aggregated statistics about pacing engines',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  getStatistics(@Query() query: PacingEngineListQuery) {
    return this.pacingEngineService.getStatistics(query);
  }

  @Get('campaign/:campaignId')
  @ApiOperation({
    summary: 'Get pacing engine by campaign',
    description: 'Retrieves the pacing engine for a specific campaign',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'Campaign ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engine retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  findByCampaign(@Param('campaignId') campaignId: string) {
    return this.pacingEngineService.findByCampaign(campaignId);
  }

  @Get('session/:sessionId')
  @ApiOperation({
    summary: 'Get pacing engine by session',
    description: 'Retrieves the pacing engine for a specific dialing session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Dialing session ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engine retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  findBySession(@Param('sessionId') sessionId: string) {
    return this.pacingEngineService.findBySession(sessionId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get pacing engine by ID',
    description: 'Retrieves a specific pacing engine by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engine retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  findOne(@Param('id') id: string) {
    return this.pacingEngineService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update pacing engine',
    description: 'Updates an existing pacing engine configuration',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engine updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  update(@Param('id') id: string, @Body() updateDto: UpdatePacingEngineDto) {
    return this.pacingEngineService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete pacing engine',
    description: 'Deletes a pacing engine (must be stopped first)',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Pacing engine deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete running pacing engine',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  remove(@Param('id') id: string) {
    return this.pacingEngineService.remove(id);
  }

  @Post(':id/start')
  @ApiOperation({
    summary: 'Start pacing engine',
    description: 'Starts a pacing engine (validates minimum agents required)',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engine started successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot start (e.g., insufficient agents)',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  start(@Param('id') id: string) {
    return this.pacingEngineService.start(id);
  }

  @Post(':id/pause')
  @ApiOperation({
    summary: 'Pause pacing engine',
    description: 'Pauses a running pacing engine',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engine paused successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot pause (not running)',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  pause(@Param('id') id: string) {
    return this.pacingEngineService.pause(id);
  }

  @Post(':id/resume')
  @ApiOperation({
    summary: 'Resume pacing engine',
    description: 'Resumes a paused pacing engine',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engine resumed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot resume (not paused)',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  resume(@Param('id') id: string) {
    return this.pacingEngineService.resume(id);
  }

  @Post(':id/stop')
  @ApiOperation({
    summary: 'Stop pacing engine',
    description: 'Stops a pacing engine',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pacing engine stopped successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  stop(@Param('id') id: string) {
    return this.pacingEngineService.stop(id);
  }

  @Patch(':id/metrics')
  @ApiOperation({
    summary: 'Update pacing engine metrics',
    description: 'Updates real-time metrics for a pacing engine',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  updateMetrics(
    @Param('id') id: string,
    @Body()
    metrics: {
      availableAgents?: number;
      busyAgents?: number;
      activeCalls?: number;
      queuedCalls?: number;
      avgAnswerTimeSeconds?: number;
      avgCallDurationSeconds?: number;
      contactRate?: number;
      actualAbandonmentRate?: number;
    },
  ) {
    return this.pacingEngineService.updateMetrics(id, metrics);
  }

  @Post(':id/record-outcome')
  @ApiOperation({
    summary: 'Record call outcomes',
    description: 'Records call outcomes to track performance',
  })
  @ApiParam({
    name: 'id',
    description: 'Pacing engine ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Outcomes recorded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pacing engine not found',
  })
  recordOutcome(
    @Param('id') id: string,
    @Body()
    outcome: {
      dialed?: number;
      answered?: number;
      abandoned?: number;
      connected?: number;
    },
  ) {
    return this.pacingEngineService.recordCallOutcome(id, outcome);
  }
}
