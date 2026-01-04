/**
 * Evaluation Service
 * 
 * Business logic for evaluation management
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EVALUATION_REPOSITORY, EvaluationRepository, EvaluationFilters } from '../domain/ports/evaluation.repository';
import { SCORECARD_REPOSITORY, ScorecardRepository } from '../domain/ports/scorecard.repository';
import { Evaluation, EvaluationStatus, CriterionScore } from '../domain/evaluation.domain';
import { ScorecardStatus } from '../domain/scorecard.domain';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { ScoreCriterionDto } from './dto/score-criterion.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EvaluationService {
  constructor(
    @Inject(EVALUATION_REPOSITORY)
    private readonly evaluationRepository: EvaluationRepository,
    @Inject(SCORECARD_REPOSITORY)
    private readonly scorecardRepository: ScorecardRepository,
  ) {}

  async createEvaluation(
    organizationId: string,
    evaluatorId: string,
    dto: CreateEvaluationDto,
  ): Promise<Evaluation> {
    // Validate scorecard exists and is active
    const scorecard = await this.scorecardRepository.findById(dto.scorecardId, organizationId);
    if (!scorecard) {
      throw new NotFoundException(`Scorecard ${dto.scorecardId} not found`);
    }
    if (scorecard.status !== ScorecardStatus.ACTIVE) {
      throw new BadRequestException('Can only create evaluations with active scorecards');
    }

    const evaluation = new Evaluation(
      uuidv4(),
      organizationId,
      dto.scorecardId,
      dto.agentId,
      evaluatorId,
      dto.callId,
      dto.recordingId,
      EvaluationStatus.DRAFT,
      [],
      0,
      false,
      '',
      [],
      [],
      [],
      undefined,
      undefined,
      dto.metadata,
    );

    return await this.evaluationRepository.create(evaluation);
  }

  async findById(id: string, organizationId: string): Promise<Evaluation> {
    const evaluation = await this.evaluationRepository.findById(id, organizationId);
    if (!evaluation) {
      throw new NotFoundException(`Evaluation ${id} not found`);
    }
    return evaluation;
  }

  async findByOrganization(
    organizationId: string,
    filters?: EvaluationFilters,
  ): Promise<Evaluation[]> {
    return await this.evaluationRepository.findByOrganization(organizationId, filters);
  }

  async scoreCriterion(
    evaluationId: string,
    organizationId: string,
    dto: ScoreCriterionDto,
  ): Promise<Evaluation> {
    const evaluation = await this.findById(evaluationId, organizationId);
    
    // Get scorecard to validate criterion
    const scorecard = await this.scorecardRepository.findById(evaluation.scorecardId, organizationId);
    if (!scorecard) {
      throw new NotFoundException(`Scorecard not found`);
    }

    const criterion = scorecard.criteria.find((c: any) => c.id === dto.criterionId);
    if (!criterion) {
      throw new BadRequestException(`Criterion ${dto.criterionId} not found in scorecard`);
    }

    // Validate score range
    if (dto.score < criterion.minScore || dto.score > criterion.maxScore) {
      throw new BadRequestException(
        `Score must be between ${criterion.minScore} and ${criterion.maxScore}`,
      );
    }

    const criterionScore: CriterionScore = {
      criterionId: dto.criterionId,
      criterionName: criterion.name,
      score: dto.score,
      maxScore: criterion.maxScore,
      weight: criterion.weight,
      notes: dto.notes,
      metadata: dto.metadata,
    };

    evaluation.scoreCriterion(criterionScore);
    evaluation.calculateTotalScore(scorecard.useWeightedScoring, scorecard.passingScore);

    return await this.evaluationRepository.update(evaluation);
  }

  async submitForReview(evaluationId: string, organizationId: string): Promise<Evaluation> {
    const evaluation = await this.findById(evaluationId, organizationId);
    evaluation.submitForReview();
    return await this.evaluationRepository.update(evaluation);
  }

  async completeEvaluation(
    evaluationId: string,
    organizationId: string,
  ): Promise<Evaluation> {
    const evaluation = await this.findById(evaluationId, organizationId);
    evaluation.complete();
    return await this.evaluationRepository.update(evaluation);
  }

  async updateFeedback(
    evaluationId: string,
    organizationId: string,
    dto: UpdateFeedbackDto,
  ): Promise<Evaluation> {
    const evaluation = await this.findById(evaluationId, organizationId);
    evaluation.updateFeedback(dto);
    return await this.evaluationRepository.update(evaluation);
  }

  async disputeEvaluation(
    evaluationId: string,
    organizationId: string,
    reason: string,
  ): Promise<Evaluation> {
    const evaluation = await this.findById(evaluationId, organizationId);
    evaluation.dispute(reason);
    return await this.evaluationRepository.update(evaluation);
  }

  async calibrateEvaluation(
    evaluationId: string,
    organizationId: string,
    notes: string,
  ): Promise<Evaluation> {
    const evaluation = await this.findById(evaluationId, organizationId);
    evaluation.calibrate(notes);
    return await this.evaluationRepository.update(evaluation);
  }

  async deleteEvaluation(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId); // Check exists
    await this.evaluationRepository.delete(id, organizationId);
  }

  async getAgentStatistics(
    agentId: string,
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalEvaluations: number;
    averageScore: number;
    passRate: number;
    recentTrend: 'improving' | 'declining' | 'stable';
  }> {
    return await this.evaluationRepository.getAgentStatistics(
      agentId,
      organizationId,
      startDate,
      endDate,
    );
  }

  async getEvaluatorStatistics(
    evaluatorId: string,
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalEvaluations: number;
    averageScoreGiven: number;
    calibrationRate: number;
  }> {
    return await this.evaluationRepository.getEvaluatorStatistics(
      evaluatorId,
      organizationId,
      startDate,
      endDate,
    );
  }
}
