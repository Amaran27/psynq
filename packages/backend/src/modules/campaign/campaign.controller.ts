import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignDto, CampaignResponseDto, CampaignStatsDto } from '../../dtos/campaign.dto';
import { CampaignStatus } from '../../entities/campaign.entity';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign', description: 'Creates a new outbound dialing campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCampaign(@Body() dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    return this.campaignService.createCampaign(dto) as any;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details', description: 'Retrieves details of a specific campaign' })
  @ApiResponse({ status: 200, description: 'Campaign details', type: CampaignResponseDto })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignService.getCampaign(id) as any;
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
    return this.campaignService.listCampaigns(organizationId, status) as any;
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
    return this.campaignService.updateCampaign(id, dto) as any;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign', description: 'Deletes a campaign (only if not active)' })
  @ApiResponse({ status: 204, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete active campaign' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deleteCampaign(@Param('id') id: string): Promise<void> {
    return this.campaignService.deleteCampaign(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start campaign', description: 'Activates a campaign and begins dialing' })
  @ApiResponse({ status: 200, description: 'Campaign started', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Campaign already active or cannot be started' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async startCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignService.startCampaign(id) as any;
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause campaign', description: 'Pauses an active campaign' })
  @ApiResponse({ status: 200, description: 'Campaign paused', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Campaign not active' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async pauseCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignService.pauseCampaign(id) as any;
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop campaign', description: 'Completes a campaign permanently' })
  @ApiResponse({ status: 200, description: 'Campaign stopped', type: CampaignResponseDto })
  @ApiResponse({ status: 400, description: 'Campaign already stopped' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async stopCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignService.stopCampaign(id) as any;
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get campaign statistics', description: 'Retrieves real-time campaign statistics' })
  @ApiResponse({ status: 200, description: 'Campaign statistics', type: CampaignStatsDto })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignStats(@Param('id') id: string): Promise<CampaignStatsDto> {
    return this.campaignService.getCampaignStats(id);
  }
}
