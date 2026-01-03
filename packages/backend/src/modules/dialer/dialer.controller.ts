/**
 * Dialer Controller (Hexagonal Architecture)
 * 
 * THIN CONTROLLER - only HTTP concerns
 * Business logic lives in Use Cases and Domain
 * 
 * Flow: HTTP Request → Controller → Use Case → Domain/Repository → Response
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  StartDialingSessionDto,
  DialingSessionResponseDto,
  AssignLeadDto,
  DialerLeadResponseDto,
  RecordDialAttemptDto,
  DialerImportLeadsDto,
  DialerImportLeadsResponseDto,
  AddToDNCDto,
  CheckDNCDto,
  CheckDNCResponseDto,
  DNCEntryResponseDto,
} from '../../dtos/dialer.dto';
import { StartProgressiveDialingUseCase } from './application/start-progressive-dialing.usecase';
import { AssignLeadToAgentUseCase } from './application/assign-lead-to-agent.usecase';
import { RecordDialAttemptUseCase } from './application/record-dial-attempt.usecase';
import { GetLeadPreviewUseCase } from './application/get-lead-preview.usecase';
import { ImportLeadsUseCase } from './application/import-leads.usecase';
import { CheckDNCUseCase } from './application/check-dnc.usecase';
import { AddToDNCListUseCase } from './application/add-to-dnc-list.usecase';

@ApiTags('Dialer')
@Controller('dialer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DialerController {
  constructor(
    private readonly startDialingUseCase: StartProgressiveDialingUseCase,
    private readonly assignLeadUseCase: AssignLeadToAgentUseCase,
    private readonly recordAttemptUseCase: RecordDialAttemptUseCase,
    private readonly getLeadPreviewUseCase: GetLeadPreviewUseCase,
    private readonly importLeadsUseCase: ImportLeadsUseCase,
    private readonly checkDNCUseCase: CheckDNCUseCase,
    private readonly addToDNCUseCase: AddToDNCListUseCase,
  ) {}

  @Post('sessions/start')
  @ApiOperation({
    summary: 'Start dialing session',
    description: 'Starts a new dialing session for a campaign',
  })
  @ApiResponse({ status: 201, description: 'Session started', type: DialingSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - invalid input or campaign already has active session' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async startDialingSession(@Body() dto: StartDialingSessionDto): Promise<DialingSessionResponseDto> {
    const session = await this.startDialingUseCase.execute({
      campaignId: dto.campaignId,
      agentIds: dto.agentIds,
      linesPerAgent: dto.linesPerAgent,
      maxConcurrentCalls: dto.maxConcurrentCalls,
      dialTimeoutSeconds: dto.dialTimeoutSeconds,
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

  @Post('leads/assign')
  @ApiOperation({
    summary: 'Assign lead to agent',
    description: 'Assigns the next available lead to an agent for dialing',
  })
  @ApiResponse({ status: 200, description: 'Lead assigned', type: DialerLeadResponseDto })
  @ApiResponse({ status: 404, description: 'No available leads' })
  async assignLead(@Body() dto: AssignLeadDto): Promise<DialerLeadResponseDto | null> {
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

  @Post('leads/record-attempt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record dial attempt',
    description: 'Records a dial attempt with outcome for a lead',
  })
  @ApiResponse({ status: 200, description: 'Attempt recorded', type: DialerLeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async recordAttempt(@Body() dto: RecordDialAttemptDto): Promise<DialerLeadResponseDto> {
    const lead = await this.recordAttemptUseCase.execute({
      leadId: dto.leadId,
      outcome: dto.outcome,
      callDurationSeconds: dto.callDurationSeconds,
      notes: dto.notes,
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

  @Get('leads/:id/preview')
  @ApiOperation({
    summary: 'Get lead preview',
    description: 'Gets detailed lead information for agent preview',
  })
  @ApiResponse({ status: 200, description: 'Lead details', type: DialerLeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async getLeadPreview(@Param('id') id: string): Promise<DialerLeadResponseDto> {
    const lead = await this.getLeadPreviewUseCase.execute(id);

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

  @Post('leads/import')
  @ApiOperation({
    summary: 'Import leads',
    description: 'Bulk import leads from CSV data into a campaign',
  })
  @ApiResponse({ status: 201, description: 'Leads imported', type: DialerImportLeadsResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - invalid lead data' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async importLeads(@Body() dto: DialerImportLeadsDto): Promise<DialerImportLeadsResponseDto> {
    return this.importLeadsUseCase.execute({
      campaignId: dto.campaignId,
      leads: dto.leads,
      skipDuplicates: dto.skipDuplicates ?? true,
    });
  }

  @Post('dnc/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check DNC list',
    description: 'Checks if a phone number is on the Do Not Call list',
  })
  @ApiResponse({ status: 200, description: 'DNC check result', type: CheckDNCResponseDto })
  async checkDNC(@Body() dto: CheckDNCDto): Promise<CheckDNCResponseDto> {
    const result = await this.checkDNCUseCase.execute({
      phoneNumber: dto.phoneNumber,
      organizationId: dto.organizationId,
    });

    return {
      isOnDNCList: result.isOnDNCList,
      entry: result.entry
        ? {
            id: result.entry.id,
            phoneNumber: result.entry.phoneNumber,
            source: result.entry.source as any,
            reason: result.entry.metadata.reason,
            addedAt: result.entry.createdAt,
          }
        : undefined,
    };
  }

  @Post('dnc/add')
  @ApiOperation({
    summary: 'Add to DNC list',
    description: 'Adds a phone number to the Do Not Call list',
  })
  @ApiResponse({ status: 201, description: 'Added to DNC', type: DNCEntryResponseDto })
  @ApiResponse({ status: 400, description: 'Phone number already on DNC list' })
  async addToDNC(@Body() dto: AddToDNCDto): Promise<DNCEntryResponseDto> {
    const entry = await this.addToDNCUseCase.execute({
      phoneNumber: dto.phoneNumber,
      organizationId: dto.organizationId,
      source: dto.source,
      reason: dto.reason,
      addedBy: dto.addedBy,
      expiresAt: dto.expiresAt,
    });

    return {
      id: entry.id,
      phoneNumber: entry.phoneNumber,
      source: entry.source as any,
      reason: entry.metadata.reason,
      addedBy: entry.metadata.addedBy,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
    };
  }
}
