/**
 * Scorecard Domain Model
 * 
 * Pure TypeScript domain logic for evaluation scorecards
 * Defines criteria and scoring templates for agent evaluations
 */

export enum ScorecardStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum CriterionType {
  RATING = 'rating',         // Numeric score (1-5, 1-10, etc.)
  YES_NO = 'yes_no',         // Boolean evaluation
  TEXT = 'text',             // Free text feedback
  CHECKLIST = 'checklist',   // Multiple checkboxes
}

export interface ScorecardCriterion {
  id: string;
  name: string;
  description?: string;
  type: CriterionType;
  weight: number;           // Weight in total score (0-100)
  minScore: number;         // Minimum possible score
  maxScore: number;         // Maximum possible score
  required: boolean;
  category?: string;        // Grouping category
  options?: string[];       // For checklist/dropdown types
  metadata?: Record<string, any>;
}

export class Scorecard {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public name: string,
    public description: string,
    public status: ScorecardStatus,
    public criteria: ScorecardCriterion[],
    public passingScore: number,        // Minimum score to pass (0-100)
    public useWeightedScoring: boolean, // Use weighted vs simple average
    public metadata?: Record<string, any>,
    public readonly createdAt?: Date,
    public updatedAt?: Date,
  ) {
    this.validateScorecard();
  }

  private validateScorecard(): void {
    if (this.name.trim().length === 0) {
      throw new Error('Scorecard name is required');
    }

    if (this.passingScore < 0 || this.passingScore > 100) {
      throw new Error('Passing score must be between 0 and 100');
    }

    if (this.criteria.length === 0) {
      throw new Error('Scorecard must have at least one criterion');
    }

    // Validate weighted scoring
    if (this.useWeightedScoring) {
      const totalWeight = this.criteria.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error('Criteria weights must sum to 100 for weighted scoring');
      }
    }

    // Validate each criterion
    this.criteria.forEach(c => this.validateCriterion(c));
  }

  private validateCriterion(criterion: ScorecardCriterion): void {
    if (!criterion.name || criterion.name.trim().length === 0) {
      throw new Error('Criterion name is required');
    }

    if (criterion.weight < 0 || criterion.weight > 100) {
      throw new Error('Criterion weight must be between 0 and 100');
    }

    if (criterion.minScore > criterion.maxScore) {
      throw new Error('Criterion minScore cannot exceed maxScore');
    }

    if (criterion.type === CriterionType.CHECKLIST && (!criterion.options || criterion.options.length === 0)) {
      throw new Error('Checklist criterion must have options');
    }
  }

  /**
   * Check if scorecard can be modified
   */
  canBeModified(): boolean {
    return this.status === ScorecardStatus.DRAFT;
  }

  /**
   * Activate scorecard for use
   */
  activate(): void {
    if (this.status === ScorecardStatus.ACTIVE) {
      throw new Error('Scorecard is already active');
    }

    if (this.status === ScorecardStatus.ARCHIVED) {
      throw new Error('Cannot activate an archived scorecard');
    }

    this.validateScorecard();
    this.status = ScorecardStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Archive scorecard (soft delete)
   */
  archive(): void {
    if (this.status === ScorecardStatus.ARCHIVED) {
      throw new Error('Scorecard is already archived');
    }

    this.status = ScorecardStatus.ARCHIVED;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.archivedAt = new Date().toISOString();
    }
  }

  /**
   * Update scorecard details
   */
  update(updates: {
    name?: string;
    description?: string;
    passingScore?: number;
    useWeightedScoring?: boolean;
  }): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify scorecard in current status');
    }

    if (updates.name !== undefined) {
      this.name = updates.name;
    }
    if (updates.description !== undefined) {
      this.description = updates.description;
    }
    if (updates.passingScore !== undefined) {
      this.passingScore = updates.passingScore;
    }
    if (updates.useWeightedScoring !== undefined) {
      this.useWeightedScoring = updates.useWeightedScoring;
    }

    this.validateScorecard();
    this.updatedAt = new Date();
  }

  /**
   * Add criterion to scorecard
   */
  addCriterion(criterion: ScorecardCriterion): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify scorecard in current status');
    }

    this.validateCriterion(criterion);

    // Check for duplicate IDs
    if (this.criteria.some(c => c.id === criterion.id)) {
      throw new Error('Criterion with this ID already exists');
    }

    this.criteria.push(criterion);
    this.updatedAt = new Date();
  }

  /**
   * Update existing criterion
   */
  updateCriterion(criterionId: string, updates: Partial<ScorecardCriterion>): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify scorecard in current status');
    }

    const index = this.criteria.findIndex(c => c.id === criterionId);
    if (index === -1) {
      throw new Error('Criterion not found');
    }

    const updated = { ...this.criteria[index], ...updates };
    this.validateCriterion(updated);

    this.criteria[index] = updated;
    this.updatedAt = new Date();
  }

  /**
   * Remove criterion from scorecard
   */
  removeCriterion(criterionId: string): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot modify scorecard in current status');
    }

    const index = this.criteria.findIndex(c => c.id === criterionId);
    if (index === -1) {
      throw new Error('Criterion not found');
    }

    this.criteria.splice(index, 1);

    if (this.criteria.length === 0) {
      throw new Error('Cannot remove last criterion');
    }

    this.updatedAt = new Date();
  }

  /**
   * Calculate maximum possible score
   */
  getMaxPossibleScore(): number {
    if (this.useWeightedScoring) {
      return 100; // Weighted scores normalized to 100
    }

    return this.criteria.reduce((sum, c) => sum + c.maxScore, 0) / this.criteria.length;
  }

  /**
   * Get criteria by category
   */
  getCriteriaByCategory(category: string): ScorecardCriterion[] {
    return this.criteria.filter(c => c.category === category);
  }

  /**
   * Get all unique categories
   */
  getCategories(): string[] {
    const categories = new Set(this.criteria.map(c => c.category).filter(Boolean));
    return Array.from(categories) as string[];
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
  }
}
