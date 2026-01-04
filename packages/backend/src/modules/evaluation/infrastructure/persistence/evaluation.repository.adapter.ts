/**
 * Evaluation Repository Adapter
 * 
 * TypeORM implementation of EvaluationRepository
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EvaluationRepository, EvaluationFilters } from '../../domain/ports/evaluation.repository';
import { Evaluation, EvaluationStatus } from '../../domain/evaluation.domain';
import { EvaluationEntity } from './evaluation.entity';

@Injectable()
export class EvaluationRepositoryAdapter implements EvaluationRepository {
  constructor(
    @InjectRepository(EvaluationEntity)
    private readonly repository: Repository<EvaluationEntity>,
  ) {}

  async create(evaluation: Evaluation): Promise<Evaluation> {
    const entity = this.toEntity(evaluation);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string, organizationId: string): Promise<Evaluation | null> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganization(organizationId: string, filters?: EvaluationFilters): Promise<Evaluation[]> {
    const query = this.repository
      .createQueryBuilder('evaluation')
      .where('evaluation.organizationId = :organizationId', { organizationId });

    if (filters?.agentId) {
      query.andWhere('evaluation.agentId = :agentId', { agentId: filters.agentId });
    }
    if (filters?.evaluatorId) {
      query.andWhere('evaluation.evaluatorId = :evaluatorId', { evaluatorId: filters.evaluatorId });
    }
    if (filters?.scorecardId) {
      query.andWhere('evaluation.scorecardId = :scorecardId', { scorecardId: filters.scorecardId });
    }
    if (filters?.callId) {
      query.andWhere('evaluation.callId = :callId', { callId: filters.callId });
    }
    if (filters?.status) {
      query.andWhere('evaluation.status = :status', { status: filters.status });
    }
    if (filters?.startDate && filters?.endDate) {
      query.andWhere('evaluation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const entities = await query.orderBy('evaluation.createdAt', 'DESC').getMany();
    return entities.map(e => this.toDomain(e));
  }

  async update(evaluation: Evaluation): Promise<Evaluation> {
    const entity = this.toEntity(evaluation);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
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
    const query = this.repository
      .createQueryBuilder('evaluation')
      .where('evaluation.organizationId = :organizationId', { organizationId })
      .andWhere('evaluation.agentId = :agentId', { agentId })
      .andWhere('evaluation.status = :status', { status: EvaluationStatus.COMPLETED });

    if (startDate && endDate) {
      query.andWhere('evaluation.completedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const evaluations = await query.getMany();

    const totalEvaluations = evaluations.length;
    const averageScore = totalEvaluations > 0
      ? evaluations.reduce((sum, e) => sum + Number(e.totalScore), 0) / totalEvaluations
      : 0;
    const passRate = totalEvaluations > 0
      ? (evaluations.filter(e => e.passed).length / totalEvaluations) * 100
      : 0;

    // Calculate trend (last 5 vs previous 5)
    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (totalEvaluations >= 10) {
      const recent = evaluations.slice(0, 5);
      const previous = evaluations.slice(5, 10);
      const recentAvg = recent.reduce((sum, e) => sum + Number(e.totalScore), 0) / 5;
      const previousAvg = previous.reduce((sum, e) => sum + Number(e.totalScore), 0) / 5;
      
      const diff = recentAvg - previousAvg;
      if (diff > 2) recentTrend = 'improving';
      else if (diff < -2) recentTrend = 'declining';
    }

    return {
      totalEvaluations,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      recentTrend,
    };
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
    const query = this.repository
      .createQueryBuilder('evaluation')
      .where('evaluation.organizationId = :organizationId', { organizationId })
      .andWhere('evaluation.evaluatorId = :evaluatorId', { evaluatorId })
      .andWhere('evaluation.status != :draftStatus', { draftStatus: EvaluationStatus.DRAFT });

    if (startDate && endDate) {
      query.andWhere('evaluation.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const evaluations = await query.getMany();

    const totalEvaluations = evaluations.length;
    const averageScoreGiven = totalEvaluations > 0
      ? evaluations.reduce((sum, e) => sum + Number(e.totalScore), 0) / totalEvaluations
      : 0;
    const calibrated = evaluations.filter(e => e.status === EvaluationStatus.CALIBRATED).length;
    const calibrationRate = totalEvaluations > 0
      ? (calibrated / totalEvaluations) * 100
      : 0;

    return {
      totalEvaluations,
      averageScoreGiven: Math.round(averageScoreGiven * 100) / 100,
      calibrationRate: Math.round(calibrationRate * 100) / 100,
    };
  }

  private toEntity(domain: Evaluation): EvaluationEntity {
    const entity = new EvaluationEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.scorecardId = domain.scorecardId;
    entity.agentId = domain.agentId;
    entity.evaluatorId = domain.evaluatorId;
    entity.callId = domain.callId || null;
    entity.recordingId = domain.recordingId || null;
    entity.status = domain.status;
    entity.scores = domain.scores;
    entity.totalScore = domain.totalScore;
    entity.passed = domain.passed;
    entity.feedback = domain.feedback;
    entity.strengths = domain.strengths;
    entity.areasForImprovement = domain.areasForImprovement;
    entity.actionItems = domain.actionItems;
    entity.calibrationNotes = domain.calibrationNotes || null;
    entity.disputeReason = domain.disputeReason || null;
    entity.metadata = domain.metadata;
    if (domain.createdAt) entity.createdAt = domain.createdAt;
    if (domain.updatedAt) entity.updatedAt = domain.updatedAt;
    if (domain.completedAt) entity.completedAt = domain.completedAt;
    return entity;
  }

  private toDomain(entity: EvaluationEntity): Evaluation {
    return new Evaluation(
      entity.id,
      entity.organizationId,
      entity.scorecardId,
      entity.agentId,
      entity.evaluatorId,
      entity.callId || undefined,
      entity.recordingId || undefined,
      entity.status as EvaluationStatus,
      entity.scores,
      Number(entity.totalScore),
      entity.passed,
      entity.feedback,
      entity.strengths || [],
      entity.areasForImprovement || [],
      entity.actionItems || [],
      entity.calibrationNotes || undefined,
      entity.disputeReason || undefined,
      entity.metadata,
      entity.createdAt,
      entity.updatedAt,
      entity.completedAt || undefined,
    );
  }
}
