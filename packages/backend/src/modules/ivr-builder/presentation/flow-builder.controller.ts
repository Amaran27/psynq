/**
 * Flow Builder Controller
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { FlowBuilderService } from '../application/flow-builder.service';
import { CreateFlowDto } from '../application/dto/create-flow.dto';
import { UpdateFlowDto } from '../application/dto/update-flow.dto';

@ApiTags('IVR Flows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ivr/flows')
export class FlowBuilderController {
  constructor(private readonly flowBuilderService: FlowBuilderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new IVR flow' })
  @ApiResponse({ status: 201, description: 'Flow created successfully' })
  async create(@Request() req, @Body() dto: CreateFlowDto) {
    const organizationId = req.user.organizationId;
    return await this.flowBuilderService.createFlow(organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all flows for organization' })
  @ApiResponse({ status: 200, description: 'List of flows' })
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.user.organizationId;
    return await this.flowBuilderService.findByOrganization(organizationId, { status, search });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get flow statistics for organization' })
  @ApiResponse({ status: 200, description: 'Flow statistics' })
  async getStatistics(@Request() req) {
    const organizationId = req.user.organizationId;
    return await this.flowBuilderService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flow by ID' })
  @ApiResponse({ status: 200, description: 'Flow details' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.flowBuilderService.findById(id, organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update flow' })
  @ApiResponse({ status: 200, description: 'Flow updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot modify published flow' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateFlowDto,
  ) {
    const organizationId = req.user.organizationId;
    return await this.flowBuilderService.updateFlow(id, organizationId, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish flow' })
  @ApiResponse({ status: 200, description: 'Flow published successfully' })
  async publish(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.flowBuilderService.publishFlow(id, organizationId);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive flow' })
  @ApiResponse({ status: 200, description: 'Flow archived successfully' })
  async archive(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.flowBuilderService.archiveFlow(id, organizationId);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone flow' })
  @ApiResponse({ status: 200, description: 'Flow cloned successfully' })
  async clone(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.flowBuilderService.cloneFlow(id, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete flow' })
  @ApiResponse({ status: 200, description: 'Flow deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete published flow' })
  async remove(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    await this.flowBuilderService.deleteFlow(id, organizationId);
    return { message: 'Flow deleted successfully' };
  }
}
