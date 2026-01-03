/**
 * IVR Controller
 * 
 * REST API endpoints for IVR flow management
 */

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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateFlowUseCase } from './application/create-flow.usecase';
import { GetFlowUseCase } from './application/get-flow.usecase';
import { ListFlowsUseCase } from './application/list-flows.usecase';
import { UpdateFlowUseCase } from './application/update-flow.usecase';
import { DeleteFlowUseCase } from './application/delete-flow.usecase';
import { ActivateFlowUseCase } from './application/activate-flow.usecase';
import { GetExecutionLogUseCase } from './application/get-execution-log.usecase';
import { GetFlowAnalyticsUseCase } from './application/get-flow-analytics.usecase';
import {
  CreateFlowDto,
  UpdateFlowDto,
  FlowResponseDto,
  FlowListResponseDto,
  ListFlowsQueryDto,
  ExecutionLogResponseDto,
  FlowAnalyticsQueryDto,
  FlowAnalyticsResponseDto,
} from '../../dtos/ivr.dto';

@ApiTags('IVR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ivr')
export class IVRController {
  constructor(
    private readonly createFlowUseCase: CreateFlowUseCase,
    private readonly getFlowUseCase: GetFlowUseCase,
    private readonly listFlowsUseCase: ListFlowsUseCase,
    private readonly updateFlowUseCase: UpdateFlowUseCase,
    private readonly deleteFlowUseCase: DeleteFlowUseCase,
    private readonly activateFlowUseCase: ActivateFlowUseCase,
    private readonly getExecutionLogUseCase: GetExecutionLogUseCase,
    private readonly getFlowAnalyticsUseCase: GetFlowAnalyticsUseCase,
  ) {}

  @Post('flows')
  @ApiOperation({ summary: 'Create IVR flow' })
  @ApiResponse({ status: 201, description: 'Flow created', type: FlowResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid flow' })
  @ApiResponse({ status: 409, description: 'Flow name already exists' })
  async createFlow(
    @Body() dto: CreateFlowDto,
    @Request() req: any,
  ): Promise<FlowResponseDto> {
    const flow = await this.createFlowUseCase.execute({
      name: dto.name,
      description: dto.description,
      organizationId: req.user.organizationId,
      nodes: dto.nodes,
      entryNodeId: dto.entryNodeId,
      variables: dto.variables,
    });

    return FlowResponseDto.fromDomain(flow);
  }

  @Get('flows')
  @ApiOperation({ summary: 'List IVR flows' })
  @ApiResponse({ status: 200, description: 'Flows retrieved', type: FlowListResponseDto })
  async listFlows(
    @Query() query: ListFlowsQueryDto,
    @Request() req: any,
  ): Promise<FlowListResponseDto> {
    const result = await this.listFlowsUseCase.execute({
      organizationId: req.user.organizationId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      flows: result.flows.map(f => FlowResponseDto.fromDomain(f)),
      total: result.total,
      limit: query.limit || 20,
      offset: query.offset || 0,
    };
  }

  @Get('flows/:id')
  @ApiOperation({ summary: 'Get IVR flow details' })
  @ApiResponse({ status: 200, description: 'Flow retrieved', type: FlowResponseDto })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async getFlow(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<FlowResponseDto> {
    const flow = await this.getFlowUseCase.execute(id, req.user.organizationId);
    return FlowResponseDto.fromDomain(flow);
  }

  @Put('flows/:id')
  @ApiOperation({ summary: 'Update IVR flow' })
  @ApiResponse({ status: 200, description: 'Flow updated', type: FlowResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid flow' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  @ApiResponse({ status: 409, description: 'Flow name already exists' })
  async updateFlow(
    @Param('id') id: string,
    @Body() dto: UpdateFlowDto,
    @Request() req: any,
  ): Promise<FlowResponseDto> {
    const flow = await this.updateFlowUseCase.execute({
      flowId: id,
      organizationId: req.user.organizationId,
      name: dto.name,
      description: dto.description,
      nodes: dto.nodes,
      entryNodeId: dto.entryNodeId,
      variables: dto.variables,
    });

    return FlowResponseDto.fromDomain(flow);
  }

  @Delete('flows/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete IVR flow' })
  @ApiResponse({ status: 204, description: 'Flow deleted' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async deleteFlow(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    await this.deleteFlowUseCase.execute(id, req.user.organizationId);
  }

  @Post('flows/:id/activate')
  @ApiOperation({ summary: 'Activate IVR flow' })
  @ApiResponse({ status: 200, description: 'Flow activated', type: FlowResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid flow or already active' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async activateFlow(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<FlowResponseDto> {
    const flow = await this.activateFlowUseCase.execute(id, req.user.organizationId);
    return FlowResponseDto.fromDomain(flow);
  }

  @Post('flows/:id/archive')
  @ApiOperation({ summary: 'Archive IVR flow' })
  @ApiResponse({ status: 200, description: 'Flow archived', type: FlowResponseDto })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async archiveFlow(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<FlowResponseDto> {
    // Get flow
    const flow = await this.getFlowUseCase.execute(id, req.user.organizationId);
    
    // Archive it
    flow.archive();
    
    // Update via use case
    const updated = await this.updateFlowUseCase.execute({
      flowId: id,
      organizationId: req.user.organizationId,
      nodes: flow.nodes,
      entryNodeId: flow.entryNodeId,
    });

    return FlowResponseDto.fromDomain(updated);
  }

  @Get('executions/:callId')
  @ApiOperation({ summary: 'Get IVR execution log' })
  @ApiResponse({ status: 200, description: 'Execution log retrieved', type: ExecutionLogResponseDto })
  @ApiResponse({ status: 404, description: 'Execution log not found' })
  async getExecutionLog(
    @Param('callId') callId: string,
    @Request() req: any,
  ): Promise<ExecutionLogResponseDto> {
    const log = await this.getExecutionLogUseCase.execute(callId, req.user.organizationId);
    return ExecutionLogResponseDto.fromDomain(log);
  }

  @Get('flows/:id/analytics')
  @ApiOperation({ summary: 'Get flow analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved', type: FlowAnalyticsResponseDto })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async getFlowAnalytics(
    @Param('id') id: string,
    @Query() query: FlowAnalyticsQueryDto,
    @Request() req: any,
  ): Promise<FlowAnalyticsResponseDto> {
    return await this.getFlowAnalyticsUseCase.execute(
      id,
      req.user.organizationId,
      query.startDate,
      query.endDate,
    );
  }
}
