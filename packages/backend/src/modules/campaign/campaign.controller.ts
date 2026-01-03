import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateCampaignDto, UpdateCampaignDto, CampaignResponseDto, CampaignStatsDto } from '../../dtos/campaign.dto';
import { CampaignStatus } from '../../entities/campaign.entity';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateCampaignUseCase } from './application/create-campaign.usecase';
import { GetCampaignUseCase } from './application/get-campaign.usecase';
import { ListCampaignsUseCase } from './application/list-campaigns.usecase';
import { UpdateCampaignUseCase } from './application/update-campaign.usecase';
import { DeleteCampaignUseCase } from './application/delete-campaign.usecase';
import { StartCampaignUseCase } from './application/start-campaign.usecase';
import { Campaign } from './domain/campaign.domain';

/**
 * Campaign Controller (Hexagonal Architecture)
 * 
 * THIN CONTROLLER - only HTTP concerns
 * Business logic lives in Use Cases and Domain
 * 
 * Flow: HTTP Request → Controller → Use Case → Domain/Repository → Response
 */
@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignController {
  constructor(
    private readonly createCampaignUseCase: CreateCampaignUseCase,
    private readonly getCampaignUseCase: GetCampaignUseCase,
    private readonly listCampaignsUseCase: ListCampaignsUseCase,
    private readonly updateCampaignUseCase: UpdateCampaignUseCase,
    private readonly deleteCampaignUseCase: DeleteCampaignUseCase,
    private readonly startCampaignUseCase: StartCampaignUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign', description: 'Creates a new outbound dialing campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCampaign(@Body() dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    const campaign = await this.createCampaignUseCase.execute(dto as any);
    return this.toResponseDto(campaign);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details', description: 'Retrieves details of a specific campaign' })
  @ApiResponse({ status: 200, description: 'Campaign details', type: CampaignResponseDto })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    const campaign = await this.getCampaignUseCase.execute(id);
    return this.toResponseDto(campaign);
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns', description: 'Retrieves list of campaigns with optional filters' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization ID' })
  @ApiQuery({ name: 'status', required: false, enum: CampaignStatus, description: 'Filter by campaign status' })
  @ApiResponse({ status: 200, description: 'List of campaigns', type: [CampaignResponseDto] })
  async listCampaigns(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: CampaignStatus,
  ): Promise<CampaignResponseDto[]> {
    const campaigns = await this.listCampaignsUseCase.execute({ organizationId, status: status as any });
    return campaigns.map(c => this.toResponseDto(c));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign', description: 'Updates campaign configuration' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or cannot update active campaign' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.updateCampaignUseCase.execute(id, dto as any);
    return this.toResponseDto(campaign);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign', description: 'Deletes a campaign (only if not active)' })
  @ApiResponse({ status: 204, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete active campaign' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deleteCampaign(@Param('id') id: string): Promise<void> {
    await this.deleteCampaignUseCase.execute(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start campaign', description: 'Activates a campaign and begins dialing' })
  @ApiResponse({ status: 200, description: 'Campaign started', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Campaign already active or cannot be started' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async startCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    const campaign = await this.startCampaignUseCase.execute(id);
    return this.toResponseDto(campaign);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause campaign', description: 'Pauses an active campaign' })
  @ApiResponse({ status: 200, description: 'Campaign paused', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Campaign not active' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async pauseCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    const campaign = await this.getCampaignUseCase.execute(id);
    campaign.pause(); // Domain logic
    // Note: Need PauseCampaignUseCase to persist, but for now use update
    const updated = await this.updateCampaignUseCase.execute(id, {});
    return this.toResponseDto(updated);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop campaign', description: 'Completes a campaign permanently' })
  @ApiResponse({ status: 200, description: 'Campaign stopped', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Campaign already stopped' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async stopCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    const campaign = await this.getCampaignUseCase.execute(id);
    campaign.complete(); // Domain logic
    // Note: Need StopCampaignUseCase to persist, but for now use update
    const updated = await this.updateCampaignUseCase.execute(id, {});
    return this.toResponseDto(updated);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get campaign statistics', description: 'Retrieves real-time campaign statistics' })
  @ApiResponse({ status: 200, description: 'Campaign statistics', type: CampaignStatsDto })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignStats(@Param('id') id: string): Promise<CampaignStatsDto> {
    const campaign = await this.getCampaignUseCase.execute(id);
    return campaign.stats as any;
  }

  /**
   * Helper to convert domain Campaign to Response DTO
   */
  private toResponseDto(campaign: Campaign): CampaignResponseDto {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      name: campaign.name,
      description: campaign.description,
      type: campaign.type as any,
      status: campaign.status as any,
      dialMode: campaign.dialMode as any,
      startTime: campaign.startTime,
      endTime: campaign.endTime,
      schedule: campaign.schedule,
      maxAttempts: campaign.maxAttempts,
      retryIntervalMinutes: campaign.retryIntervalMinutes,
      abandonmentRate: campaign.abandonmentRate,
      linesPerAgent: campaign.linesPerAgent,
      leadListId: campaign.leadListId,
      totalLeads: campaign.stats.totalLeads,
      contactedLeads: campaign.stats.contactedLeads,
      successfulCalls: campaign.stats.successfulCalls,
      failedAttempts: campaign.stats.failedAttempts,
      avgCallDurationSeconds: campaign.stats.avgCallDurationSeconds,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
    } as any;
  }
}
