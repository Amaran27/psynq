/**
 * Scorecard Controller
 * 
 * REST API endpoints for scorecard management
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
import { ScorecardService } from '../application/scorecard.service';
import { CreateScorecardDto } from '../application/dto/create-scorecard.dto';
import { UpdateScorecardDto } from '../application/dto/update-scorecard.dto';

@ApiTags('Scorecards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scorecards')
export class ScorecardController {
  constructor(private readonly scorecardService: ScorecardService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new scorecard' })
  @ApiResponse({ status: 201, description: 'Scorecard created successfully' })
  async create(@Request() req, @Body() dto: CreateScorecardDto) {
    const organizationId = req.user.organizationId;
    return await this.scorecardService.createScorecard(organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all scorecards for organization' })
  @ApiResponse({ status: 200, description: 'List of scorecards' })
  async findAll(@Request() req, @Query('status') status?: string) {
    const organizationId = req.user.organizationId;
    return await this.scorecardService.findByOrganization(organizationId, status);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get scorecard statistics for organization' })
  @ApiResponse({ status: 200, description: 'Scorecard statistics' })
  async getStatistics(@Request() req) {
    const organizationId = req.user.organizationId;
    return await this.scorecardService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scorecard by ID' })
  @ApiResponse({ status: 200, description: 'Scorecard details' })
  @ApiResponse({ status: 404, description: 'Scorecard not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.scorecardService.findById(id, organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update scorecard' })
  @ApiResponse({ status: 200, description: 'Scorecard updated successfully' })
  @ApiResponse({ status: 400, description: 'Only draft scorecards can be modified' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateScorecardDto,
  ) {
    const organizationId = req.user.organizationId;
    return await this.scorecardService.updateScorecard(id, organizationId, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate scorecard' })
  @ApiResponse({ status: 200, description: 'Scorecard activated successfully' })
  async activate(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.scorecardService.activateScorecard(id, organizationId);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive scorecard' })
  @ApiResponse({ status: 200, description: 'Scorecard archived successfully' })
  async archive(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.scorecardService.archiveScorecard(id, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete scorecard' })
  @ApiResponse({ status: 200, description: 'Scorecard deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete active scorecard' })
  async remove(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    await this.scorecardService.deleteScorecard(id, organizationId);
    return { message: 'Scorecard deleted successfully' };
  }
}
