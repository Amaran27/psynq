/**
 * Evaluation Controller
 * 
 * REST API endpoints for evaluation management
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
import { EvaluationService } from '../application/evaluation.service';
import { CreateEvaluationDto } from '../application/dto/create-evaluation.dto';
import { ScoreCriterionDto } from '../application/dto/score-criterion.dto';
import { UpdateFeedbackDto } from '../application/dto/update-feedback.dto';

@ApiTags('Evaluations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new evaluation' })
  @ApiResponse({ status: 201, description: 'Evaluation created successfully' })
  async create(@Request() req, @Body() dto: CreateEvaluationDto) {
    const organizationId = req.user.organizationId;
    const evaluatorId = req.user.userId;
    return await this.evaluationService.createEvaluation(organizationId, evaluatorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List evaluations with filters' })
  @ApiResponse({ status: 200, description: 'List of evaluations' })
  async findAll(
    @Request() req,
    @Query('agentId') agentId?: string,
    @Query('evaluatorId') evaluatorId?: string,
    @Query('scorecardId') scorecardId?: string,
    @Query('callId') callId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId = req.user.organizationId;
    const filters: any = {};
    
    if (agentId) filters.agentId = agentId;
    if (evaluatorId) filters.evaluatorId = evaluatorId;
    if (scorecardId) filters.scorecardId = scorecardId;
    if (callId) filters.callId = callId;
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return await this.evaluationService.findByOrganization(organizationId, filters);
  }

  @Get('agent/:agentId/statistics')
  @ApiOperation({ summary: 'Get agent evaluation statistics' })
  @ApiResponse({ status: 200, description: 'Agent statistics' })
  async getAgentStats(
    @Request() req,
    @Param('agentId') agentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.getAgentStatistics(
      agentId,
      organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('evaluator/:evaluatorId/statistics')
  @ApiOperation({ summary: 'Get evaluator statistics' })
  @ApiResponse({ status: 200, description: 'Evaluator statistics' })
  async getEvaluatorStats(
    @Request() req,
    @Param('evaluatorId') evaluatorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.getEvaluatorStatistics(
      evaluatorId,
      organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evaluation by ID' })
  @ApiResponse({ status: 200, description: 'Evaluation details' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.findById(id, organizationId);
  }

  @Post(':id/score-criterion')
  @ApiOperation({ summary: 'Score a criterion in evaluation' })
  @ApiResponse({ status: 200, description: 'Criterion scored successfully' })
  async scoreCriterion(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ScoreCriterionDto,
  ) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.scoreCriterion(id, organizationId, dto);
  }

  @Post(':id/submit-review')
  @ApiOperation({ summary: 'Submit evaluation for review' })
  @ApiResponse({ status: 200, description: 'Evaluation submitted for review' })
  async submitReview(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.submitForReview(id, organizationId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete evaluation' })
  @ApiResponse({ status: 200, description: 'Evaluation completed successfully' })
  async complete(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.completeEvaluation(id, organizationId);
  }

  @Put(':id/feedback')
  @ApiOperation({ summary: 'Update evaluation feedback' })
  @ApiResponse({ status: 200, description: 'Feedback updated successfully' })
  async updateFeedback(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackDto,
  ) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.updateFeedback(id, organizationId, dto);
  }

  @Post(':id/dispute')
  @ApiOperation({ summary: 'Dispute evaluation' })
  @ApiResponse({ status: 200, description: 'Evaluation disputed' })
  async dispute(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.disputeEvaluation(id, organizationId, reason);
  }

  @Post(':id/calibrate')
  @ApiOperation({ summary: 'Calibrate evaluation (QA approval)' })
  @ApiResponse({ status: 200, description: 'Evaluation calibrated' })
  async calibrate(
    @Request() req,
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    const organizationId = req.user.organizationId;
    return await this.evaluationService.calibrateEvaluation(id, organizationId, notes);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete evaluation' })
  @ApiResponse({ status: 200, description: 'Evaluation deleted successfully' })
  async remove(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    await this.evaluationService.deleteEvaluation(id, organizationId);
    return { message: 'Evaluation deleted successfully' };
  }
}
