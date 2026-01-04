/**
 * Flow Execution Controller
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { FlowExecutionService } from '../application/flow-execution.service';

@ApiTags('IVR Executions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ivr/executions')
export class FlowExecutionController {
  constructor(private readonly executionService: FlowExecutionService) {}

  @Post()
  @ApiOperation({ summary: 'Start flow execution' })
  @ApiResponse({ status: 201, description: 'Execution started' })
  async start(
    @Request() req,
    @Body() body: { flowId: string; callId: string; context?: Record<string, any> },
  ) {
    const organizationId = req.user.organizationId;
    return await this.executionService.startExecution(
      organizationId,
      body.flowId,
      body.callId,
      body.context,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List executions with filters' })
  @ApiResponse({ status: 200, description: 'List of executions' })
  async findAll(
    @Request() req,
    @Query('flowId') flowId?: string,
    @Query('callId') callId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId = req.user.organizationId;
    const filters: any = {};
    
    if (flowId) filters.flowId = flowId;
    if (callId) filters.callId = callId;
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return await this.executionService.findByOrganization(organizationId, filters);
  }

  @Get('flow/:flowId/statistics')
  @ApiOperation({ summary: 'Get flow execution statistics' })
  @ApiResponse({ status: 200, description: 'Execution statistics' })
  async getFlowStats(@Request() req, @Param('flowId') flowId: string) {
    const organizationId = req.user.organizationId;
    return await this.executionService.getFlowStatistics(flowId, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution by ID' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.executionService.findById(id, organizationId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete execution' })
  @ApiResponse({ status: 200, description: 'Execution completed' })
  async complete(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.executionService.completeExecution(id, organizationId);
  }

  @Post(':id/fail')
  @ApiOperation({ summary: 'Mark execution as failed' })
  @ApiResponse({ status: 200, description: 'Execution failed' })
  async fail(@Request() req, @Param('id') id: string, @Body('error') error: string) {
    const organizationId = req.user.organizationId;
    return await this.executionService.failExecution(id, organizationId, error);
  }

  @Post(':id/timeout')
  @ApiOperation({ summary: 'Mark execution as timed out' })
  @ApiResponse({ status: 200, description: 'Execution timed out' })
  async timeout(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.executionService.timeoutExecution(id, organizationId);
  }

  @Post(':id/abandon')
  @ApiOperation({ summary: 'Mark execution as abandoned' })
  @ApiResponse({ status: 200, description: 'Execution abandoned' })
  async abandon(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.executionService.abandonExecution(id, organizationId);
  }
}
