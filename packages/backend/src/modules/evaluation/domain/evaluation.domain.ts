/**
 * Evaluation Domain Model
 * 
 * Pure TypeScript domain logic for agent evaluations
 * Records assessments of agent performance using scorecards
 */

export enum EvaluationStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CALIBRATED = 'calibrated',
}

export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  weight: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export class Evaluation {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly scorecardId: string,
    public readonly agentId: string,
    public readonly evaluatorId: string,
    public readonly callId: string | undefined,
    public readonly recordingId: string | undefined,
    public status: EvaluationStatus,
    public scores: CriterionScore[],
    public totalScore: number,
    public passed: boolean,
    public feedback: string,
    public strengths: string[],
    public areasForImprovement: string[],
    public actionItems: string[],
    public calibrationNotes?: string,
    public disputeReason?: string,
    public metadata?: Record<string, any>,
    public readonly createdAt?: Date,
    public updatedAt?: Date,
    public completedAt?: Date,
  ) {
    this.validateEvaluation();
  }

  private validateEvaluation(): void {
    if (this.totalScore < 0 || this.totalScore > 100) {
      throw new Error('Total score must be between 0 and 100');
    }

    if (this.scores.length === 0 && this.status !== EvaluationStatus.DRAFT) {
      throw new Error('Evaluation must have at least one criterion score');
    }

    // Validate each score
    this.scores.forEach(s => {
      if (s.score < 0 || s.score > s.maxScore) {
        throw new Error(`Score for ${s.criterionName} must be between 0 and ${s.maxScore}`);
      }
    });
  }

  /**
   * Check if evaluation can be modified
   */
  canBeModified(): boolean {
    return this.status === EvaluationStatus.DRAFT || this.status === EvaluationStatus.IN_REVIEW;
  }

  /**
   * Add or update a criterion score
   */
  scoreCriterion(score: CriterionScore): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify completed evaluation');
    }

    const existingIndex = this.scores.findIndex(s => s.criterionId === score.criterionId);
    
    if (existingIndex >= 0) {
      this.scores[existingIndex] = score;
    } else {
      this.scores.push(score);
    }

    this.updatedAt = new Date();
  }

  /**
   * Calculate total score based on criterion scores
   */
  calculateTotalScore(useWeighted: boolean, passingScore: number): void {
    if (this.scores.length === 0) {
      this.totalScore = 0;
      this.passed = false;
      return;
    }

    if (useWeighted) {
      // Weighted average
      let weightedSum = 0;
      let totalWeight = 0;

      this.scores.forEach(s => {
        const normalizedScore = (s.score / s.maxScore) * 100;
        weightedSum += normalizedScore * s.weight;
        totalWeight += s.weight;
      });

      this.totalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    } else {
      // Simple average (normalize each score to 0-100 scale)
      const normalizedScores = this.scores.map(s => (s.score / s.maxScore) * 100);
      this.totalScore = normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length;
    }

    this.passed = this.totalScore >= passingScore;
    this.updatedAt = new Date();
  }

  /**
   * Submit evaluation for review
   */
  submitForReview(): void {
    if (this.status !== EvaluationStatus.DRAFT) {
      throw new Error('Only draft evaluations can be submitted for review');
    }

    if (this.scores.length === 0) {
      throw new Error('Cannot submit evaluation without scores');
    }

    this.status = EvaluationStatus.IN_REVIEW;
    this.updatedAt = new Date();
  }

  /**
   * Complete evaluation
   */
  complete(): void {
    if (this.status === EvaluationStatus.COMPLETED) {
      throw new Error('Evaluation is already completed');
    }

    if (this.scores.length === 0) {
      throw new Error('Cannot complete evaluation without scores');
    }

    this.status = EvaluationStatus.COMPLETED;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Dispute evaluation
   */
  dispute(reason: string): void {
    if (this.status !== EvaluationStatus.COMPLETED) {
      throw new Error('Only completed evaluations can be disputed');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Dispute reason is required');
    }

    this.status = EvaluationStatus.DISPUTED;
    this.disputeReason = reason;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.disputedAt = new Date().toISOString();
    }
  }

  /**
   * Calibrate evaluation (QA approval)
   */
  calibrate(notes: string): void {
    if (this.status !== EvaluationStatus.IN_REVIEW && this.status !== EvaluationStatus.DISPUTED) {
      throw new Error('Only in-review or disputed evaluations can be calibrated');
    }

    this.status = EvaluationStatus.CALIBRATED;
    this.calibrationNotes = notes;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.calibratedAt = new Date().toISOString();
    }
  }

  /**
   * Update feedback
   */
  updateFeedback(feedback: {
    generalFeedback?: string;
    strengths?: string[];
    areasForImprovement?: string[];
    actionItems?: string[];
  }): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify completed evaluation');
    }

    if (feedback.generalFeedback !== undefined) {
      this.feedback = feedback.generalFeedback;
    }
    if (feedback.strengths !== undefined) {
      this.strengths = feedback.strengths;
    }
    if (feedback.areasForImprovement !== undefined) {
      this.areasForImprovement = feedback.areasForImprovement;
    }
    if (feedback.actionItems !== undefined) {
      this.actionItems = feedback.actionItems;
    }

    this.updatedAt = new Date();
  }

  /**
   * Get score for specific criterion
   */
  getCriterionScore(criterionId: string): CriterionScore | undefined {
    return this.scores.find(s => s.criterionId === criterionId);
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(totalCriteria: number): number {
    if (totalCriteria === 0) return 0;
    return (this.scores.length / totalCriteria) * 100;
  }

  /**
   * Check if all required criteria are scored
   */
  isComplete(requiredCriteriaIds: string[]): boolean {
    return requiredCriteriaIds.every(id => this.scores.some(s => s.criterionId === id));
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
  }

  /**
   * Get evaluation summary
   */
  getSummary(): {
    totalScore: number;
    passed: boolean;
    completedCriteria: number;
    status: EvaluationStatus;
    hasDispute: boolean;
  } {
    return {
      totalScore: this.totalScore,
      passed: this.passed,
      completedCriteria: this.scores.length,
      status: this.status,
      hasDispute: !!this.disputeReason,
    };
  }
}
