/**
 * Forecast Model Domain Model
 * 
 * Represents ML models used for demand forecasting
 */

export enum ModelType {
  LINEAR_REGRESSION = 'linear_regression',
  EXPONENTIAL_SMOOTHING = 'exponential_smoothing',
  MOVING_AVERAGE = 'moving_average',
  ARIMA = 'arima',
  NEURAL_NETWORK = 'neural_network',
}

export enum ModelStatus {
  TRAINING = 'training',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  FAILED = 'failed',
}

export interface TrainingData {
  startDate: Date;
  endDate: Date;
  samples: number;
  features: string[];
}

export interface ModelPerformance {
  accuracy: number;         // Overall accuracy (0-100%)
  precision: number;
  recall: number;
  f1Score: number;
  validationMape: number;   // MAPE on validation set
}

export class ForecastModel {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public name: string,
    public description: string,
    public type: ModelType,
    public status: ModelStatus,
    public trainingData: TrainingData,
    public version: number,
    public hyperparameters: Record<string, any>,
    public performance?: ModelPerformance,
    public metadata?: Record<string, any>,
    public readonly createdAt?: Date,
    public updatedAt?: Date,
    public trainedAt?: Date,
  ) {
    this.validateModel();
  }

  private validateModel(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Model name is required');
    }

    if (this.trainingData.startDate >= this.trainingData.endDate) {
      throw new Error('Training start date must be before end date');
    }

    if (this.trainingData.samples < 10) {
      throw new Error('Training data must have at least 10 samples');
    }

    if (this.version < 1) {
      throw new Error('Model version must be at least 1');
    }
  }

  /**
   * Check if model can be used for predictions
   */
  canPredict(): boolean {
    return this.status === ModelStatus.ACTIVE && this.performance !== undefined;
  }

  /**
   * Update model status
   */
  updateStatus(status: ModelStatus): void {
    this.status = status;
    this.updatedAt = new Date();

    if (status === ModelStatus.ACTIVE) {
      this.trainedAt = new Date();
    }
  }

  /**
   * Update model performance metrics
   */
  updatePerformance(performance: ModelPerformance): void {
    if (performance.accuracy < 0 || performance.accuracy > 100) {
      throw new Error('Accuracy must be between 0 and 100');
    }

    this.performance = performance;
    this.updatedAt = new Date();
  }

  /**
   * Update hyperparameters
   */
  updateHyperparameters(hyperparameters: Record<string, any>): void {
    this.hyperparameters = { ...this.hyperparameters, ...hyperparameters };
    this.updatedAt = new Date();
  }

  /**
   * Mark model as deprecated
   */
  deprecate(): void {
    if (this.status === ModelStatus.DEPRECATED) {
      throw new Error('Model is already deprecated');
    }

    this.status = ModelStatus.DEPRECATED;
    this.updatedAt = new Date();

    if (this.metadata) {
      this.metadata.deprecatedAt = new Date().toISOString();
    }
  }

  /**
   * Create new version of model
   */
  createNewVersion(newId: string): ForecastModel {
    return new ForecastModel(
      newId,
      this.organizationId,
      this.name,
      this.description,
      this.type,
      ModelStatus.TRAINING,
      this.trainingData,
      this.version + 1,
      { ...this.hyperparameters },
      undefined,
      { ...this.metadata, previousVersion: this.id },
    );
  }

  /**
   * Get model summary
   */
  getSummary(): {
    id: string;
    name: string;
    type: ModelType;
    status: ModelStatus;
    version: number;
    accuracy?: number;
    trainingSamples: number;
    age: number;
  } {
    const age = this.trainedAt
      ? Math.floor((new Date().getTime() - this.trainedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      version: this.version,
      accuracy: this.performance?.accuracy,
      trainingSamples: this.trainingData.samples,
      age,
    };
  }

  /**
   * Check if model needs retraining
   */
  needsRetraining(maxAgeDays: number = 30): boolean {
    if (!this.trainedAt) return true;
    
    const daysSinceTraining = Math.floor(
      (new Date().getTime() - this.trainedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysSinceTraining > maxAgeDays;
  }
}
