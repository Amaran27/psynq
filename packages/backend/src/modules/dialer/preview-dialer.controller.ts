/**
 * Preview Dialer Controller (Hexagonal Architecture)
 * 
 * THIN CONTROLLER - only HTTP concerns
 * Business logic lives in Use Cases and Domain
 */

import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  StartPreviewDialingDto,
  SkipLeadDto,
  InitiatePreviewCallDto,
  DialingSessionResponseDto,
  DialerLeadResponseDto,
  PreviewCallResponseDto,
} from '../../dtos/dialer.dto';
import { StartPreviewDialingUseCase } from './application/start-preview-dialing.usecase';
import { SkipLeadUseCase } from './application/skip-lead.usecase';
import { InitiatePreviewCallUseCase } from './application/initiate-preview-call.usecase';
import { AssignLeadToAgentUseCase } from './application/assign-lead-to-agent.usecase';

/**
 * Preview Dialer API Endpoints
 * 
 * Flow:
 * 1. POST /preview/start - Start preview dialing session
 * 2. POST /preview/next-lead - Get next lead for agent to review
 * 3. POST /preview/skip - Agent skips current lead
 * 4. POST /preview/dial - Agent initiates call to lead
 */
@ApiTags('Preview Dialer')
@Controller('preview')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PreviewDialerController {
  constructor(
    private readonly startPreviewDialingUseCase: StartPreviewDialingUseCase,
    private readonly skipLeadUseCase: SkipLeadUseCase,
    private readonly initiateCallUseCase: InitiatePreviewCallUseCase,
    private readonly assignLeadUseCase: AssignLeadToAgentUseCase,
  ) {}

  @Post('start')
  @ApiOperation({
    summary: 'Start preview dialing session',
    description: 'Starts a preview dialing session where agents manually review and dial leads',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Preview session started successfully', 
    type: DialingSessionResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid input or campaign already has active session' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async startPreviewSession(@Body() dto: StartPreviewDialingDto): Promise<DialingSessionResponseDto> {
    const session = await this.startPreviewDialingUseCase.execute({
      campaignId: dto.campaignId,
      agentIds: dto.agentIds,
      maxConcurrentSessions: dto.maxConcurrentSessions,
    });

    return {
      id: session.id,
      campaignId: session.campaignId,
      mode: session.mode as any,
      status: session.status as any,
      organizationId: session.organizationId,
      stats: session.stats,
      activeAgentIds: session.activeAgentIds,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    };
  }

  @Post('next-lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get next lead for preview',
    description: 'Assigns and retrieves the next available lead for agent to review before calling',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Next lead assigned', 
    type: DialerLeadResponseDto 
  })
  @ApiResponse({ status: 404, description: 'No available leads' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNextLead(@Body() dto: { campaignId: string; agentId: string }): Promise<DialerLeadResponseDto | null> {
    const lead = await this.assignLeadUseCase.execute({
      campaignId: dto.campaignId,
      agentId: dto.agentId,
    });

    if (!lead) return null;

    return {
      id: lead.id,
      campaignId: lead.campaignId,
      phoneNumber: lead.phoneNumber,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      status: lead.status as any,
      priority: lead.priority,
      timezone: lead.timezone,
      customData: lead.customData,
      attempts: lead.attempts,
      assignedAgentId: lead.assignedAgentId,
      lastAttemptAt: lead.lastAttemptAt,
      nextAttemptAt: lead.nextAttemptAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      contactedAt: lead.contactedAt,
      convertedAt: lead.convertedAt,
    };
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Skip current lead',
    description: 'Agent skips the currently assigned lead, returning it to the queue',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lead skipped successfully', 
    type: DialerLeadResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - lead not assigned to agent' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async skipLead(@Body() dto: SkipLeadDto): Promise<DialerLeadResponseDto> {
    const lead = await this.skipLeadUseCase.execute({
      leadId: dto.leadId,
      agentId: dto.agentId,
      dialingSessionId: dto.dialingSessionId,
      reason: dto.reason,
    });

    return {
      id: lead.id,
      campaignId: lead.campaignId,
      phoneNumber: lead.phoneNumber,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      status: lead.status as any,
      priority: lead.priority,
      timezone: lead.timezone,
      customData: lead.customData,
      attempts: lead.attempts,
      assignedAgentId: lead.assignedAgentId,
      lastAttemptAt: lead.lastAttemptAt,
      nextAttemptAt: lead.nextAttemptAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      contactedAt: lead.contactedAt,
      convertedAt: lead.convertedAt,
    };
  }

  @Post('dial')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initiate preview call',
    description: 'Agent manually initiates call to lead after reviewing details',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Call initiated successfully', 
    type: PreviewCallResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - lead not in valid state or not assigned to agent' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiateCall(@Body() dto: InitiatePreviewCallDto): Promise<PreviewCallResponseDto> {
    const result = await this.initiateCallUseCase.execute({
      leadId: dto.leadId,
      agentId: dto.agentId,
      dialingSessionId: dto.dialingSessionId,
    });

    return {
      lead: {
        id: result.lead.id,
        campaignId: result.lead.campaignId,
        phoneNumber: result.lead.phoneNumber,
        firstName: result.lead.firstName,
        lastName: result.lead.lastName,
        email: result.lead.email,
        status: result.lead.status as any,
        priority: result.lead.priority,
        timezone: result.lead.timezone,
        customData: result.lead.customData,
        attempts: result.lead.attempts,
        assignedAgentId: result.lead.assignedAgentId,
        lastAttemptAt: result.lead.lastAttemptAt,
        nextAttemptAt: result.lead.nextAttemptAt,
        createdAt: result.lead.createdAt,
        updatedAt: result.lead.updatedAt,
        contactedAt: result.lead.contactedAt,
        convertedAt: result.lead.convertedAt,
      },
      callInitiated: result.callInitiated,
      message: result.message,
    };
  }
}
