/**
 * Evaluation Repository Port
 * 
 * Interface for evaluation persistence
 */

import { Evaluation } from '../evaluation.domain';

export interface EvaluationFilters {
  agentId?: string;
  evaluatorId?: string;
  scorecardId?: string;
  callId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface EvaluationRepository {
  create(evaluation: Evaluation): Promise<Evaluation>;
  findById(id: string, organizationId: string): Promise<Evaluation | null>;
  findByOrganization(organizationId: string, filters?: EvaluationFilters): Promise<Evaluation[]>;
  update(evaluation: Evaluation): Promise<Evaluation>;
  delete(id: string, organizationId: string): Promise<void>;
  
  getAgentStatistics(agentId: string, organizationId: string, startDate?: Date, endDate?: Date): Promise<{
    totalEvaluations: number;
    averageScore: number;
    passRate: number;
    recentTrend: 'improving' | 'declining' | 'stable';
  }>;

  getEvaluatorStatistics(evaluatorId: string, organizationId: string, startDate?: Date, endDate?: Date): Promise<{
    totalEvaluations: number;
    averageScoreGiven: number;
    calibrationRate: number;
  }>;
}

export const EVALUATION_REPOSITORY = Symbol('EVALUATION_REPOSITORY');
