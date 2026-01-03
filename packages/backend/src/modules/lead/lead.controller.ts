import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { CreateLeadDto, UpdateLeadDto, LeadResponseDto, ImportLeadsDto, UpdateLeadStatusDto } from '../../dtos/lead.dto';
import { LeadStatus } from '../../entities/lead.entity';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('Leads')
@Controller('leads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lead', description: 'Creates a new lead for campaigns' })
  @ApiResponse({ status: 201, description: 'Lead created successfully', type: LeadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createLead(@Body() dto: CreateLeadDto): Promise<LeadResponseDto> {
    return this.leadService.createLead(dto) as any;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead details', description: 'Retrieves details of a specific lead' })
  @ApiResponse({ status: 200, description: 'Lead details', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async getLead(@Param('id') id: string): Promise<LeadResponseDto> {
    return this.leadService.getLead(id) as any;
  }

  @Get()
  @ApiOperation({ summary: 'List leads', description: 'Retrieves list of leads with optional filters' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization ID' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Filter by campaign ID' })
  @ApiQuery({ name: 'status', required: false, enum: LeadStatus, description: 'Filter by lead status' })
  @ApiQuery({ name: 'assignedAgentId', required: false, description: 'Filter by assigned agent' })
  @ApiResponse({ status: 200, description: 'List of leads', type: [LeadResponseDto] })
  async listLeads(
    @Query('organizationId') organizationId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: LeadStatus,
    @Query('assignedAgentId') assignedAgentId?: string,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.listLeads(organizationId, campaignId, status, assignedAgentId) as any;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update lead', description: 'Updates lead information' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully', type: LeadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async updateLead(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    return this.leadService.updateLead(id, dto) as any;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete lead', description: 'Deletes a lead' })
  @ApiResponse({ status: 204, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async deleteLead(@Param('id') id: string): Promise<void> {
    return this.leadService.deleteLead(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import leads', description: 'Bulk import leads from a list' })
  @ApiResponse({ status: 200, description: 'Leads imported', schema: { example: { imported: 100, failed: 5 } } })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async importLeads(@Body() dto: ImportLeadsDto): Promise<{ imported: number; failed: number }> {
    return this.leadService.importLeads(dto);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Update lead status', description: 'Updates the status of a lead' })
  @ApiResponse({ status: 200, description: 'Lead status updated', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async updateLeadStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ): Promise<LeadResponseDto> {
    return this.leadService.updateLeadStatus(id, dto) as any;
  }

  @Post(':id/assign/:agentId')
  @ApiOperation({ summary: 'Assign lead to agent', description: 'Assigns a lead to a specific agent' })
  @ApiResponse({ status: 200, description: 'Lead assigned', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async assignLead(
    @Param('id') id: string,
    @Param('agentId') agentId: string,
  ): Promise<LeadResponseDto> {
    return this.leadService.assignLeadToAgent(id, agentId) as any;
  }
}
