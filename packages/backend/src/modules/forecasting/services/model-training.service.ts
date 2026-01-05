import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ForecastModel,
  ModelType,
  ModelStatus,
  ModelPerformance,
} from '../domain/forecast-model.domain';
import {
  ForecastModelRepository,
  FORECAST_MODEL_REPOSITORY,
} from '../ports/forecast-model.repository.port';
import { ForecastingEngineService, TimeSeriesPoint } from './forecasting-engine.service';
import { CreateModelDto } from '../dto/create-model.dto';
import { UpdateModelDto } from '../dto/update-model.dto';
import { ModelQueryDto } from '../dto/model-query.dto';

@Injectable()
export class ModelTrainingService {
  private readonly logger = new Logger(ModelTrainingService.name);

  constructor(
    @Inject(FORECAST_MODEL_REPOSITORY)
    private readonly modelRepository: ForecastModelRepository,
    private readonly forecastingEngine: ForecastingEngineService,
  ) {}

  /**
   * Create a new forecast model
   */
  async createModel(
    organizationId: string,
    dto: CreateModelDto,
  ): Promise<ForecastModel> {
    this.logger.log(`Creating model ${dto.name} for organization ${organizationId}`);

    const model = new ForecastModel(
      uuidv4(),
      organizationId,
      dto.name,
      dto.description,
      dto.type,
      ModelStatus.TRAINING,
      {
        startDate: new Date(dto.trainingDataFrom),
        endDate: new Date(dto.trainingDataTo),
        samples: dto.minSamples,
        features: dto.features,
      },
      1,
      dto.hyperparameters || {},
      undefined,
      dto.metadata,
    );

    const saved = await this.modelRepository.create(model);
    this.logger.log(`Model ${saved.id} created successfully`);

    return saved;
  }

  /**
   * Train a model with historical data
   */
  async trainModel(
    modelId: string,
    organizationId: string,
    trainingData: TimeSeriesPoint[],
  ): Promise<ForecastModel> {
    this.logger.log(`Training model ${modelId}`);

    const model = await this.modelRepository.findById(modelId, organizationId);
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (trainingData.length < model.trainingData.samples) {
      throw new BadRequestException(
        `Insufficient training data. Required: ${model.trainingData.samples}, provided: ${trainingData.length}`,
      );
    }

    try {
      // Split data into training and validation sets (80/20)
      const splitIndex = Math.floor(trainingData.length * 0.8);
      const trainSet = trainingData.slice(0, splitIndex);
      const validationSet = trainingData.slice(splitIndex);

      // Train model and validate
      let predictions: any[];
      const forecastPeriods = validationSet.length;

      switch (model.type) {
        case ModelType.LINEAR_REGRESSION:
          predictions = this.forecastingEngine.linearRegression(
            trainSet,
            forecastPeriods,
          );
          break;
        case ModelType.MOVING_AVERAGE:
          const windowSize = model.hyperparameters?.windowSize || 7;
          predictions = this.forecastingEngine.movingAverage(
            trainSet,
            forecastPeriods,
            windowSize,
          );
          break;
        case ModelType.EXPONENTIAL_SMOOTHING:
          const alpha = model.hyperparameters?.alpha || 0.3;
          predictions = this.forecastingEngine.exponentialSmoothing(
            trainSet,
            forecastPeriods,
            alpha,
          );
          break;
        default:
          throw new BadRequestException(`Training not implemented for ${model.type}`);
      }

      // Calculate validation performance
      const performance = this.calculatePerformance(
        predictions.map(p => p.predicted),
        validationSet.map(p => p.value),
      );

      model.updatePerformance(performance);
      model.updateStatus(ModelStatus.ACTIVE);

      const updated = await this.modelRepository.update(model);
      this.logger.log(`Model ${modelId} trained successfully. Accuracy: ${performance.accuracy}%`);

      return updated;
    } catch (error) {
      this.logger.error(`Model training failed: ${error.message}`);
      model.updateStatus(ModelStatus.FAILED);
      await this.modelRepository.update(model);
      throw new BadRequestException(`Training failed: ${error.message}`);
    }
  }

  /**
   * Get model by ID
   */
  async getModel(
    id: string,
    organizationId: string,
  ): Promise<ForecastModel> {
    const model = await this.modelRepository.findById(id, organizationId);
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    return model;
  }

  /**
   * List models with filters
   */
  async listModels(
    organizationId: string,
    query: ModelQueryDto,
  ): Promise<{ models: ForecastModel[]; total: number }> {
    return this.modelRepository.findByOrganization(organizationId, {
      status: query.status,
      type: query.type,
      limit: query.limit,
      offset: query.offset,
    });
  }

  /**
   * Update model
   */
  async updateModel(
    id: string,
    organizationId: string,
    dto: UpdateModelDto,
  ): Promise<ForecastModel> {
    const model = await this.getModel(id, organizationId);

    if (dto.name) model.name = dto.name;
    if (dto.description) model.description = dto.description;
    if (dto.hyperparameters) {
      model.updateHyperparameters(dto.hyperparameters);
    }

    const updated = await this.modelRepository.update(model);
    this.logger.log(`Model ${id} updated`);

    return updated;
  }

  /**
   * Activate a model
   */
  async activateModel(
    id: string,
    organizationId: string,
  ): Promise<ForecastModel> {
    const model = await this.getModel(id, organizationId);

    if (!model.performance) {
      throw new BadRequestException('Model must be trained before activation');
    }

    model.updateStatus(ModelStatus.ACTIVE);
    const updated = await this.modelRepository.update(model);

    this.logger.log(`Model ${id} activated`);
    return updated;
  }

  /**
   * Deprecate a model
   */
  async deprecateModel(
    id: string,
    organizationId: string,
  ): Promise<ForecastModel> {
    const model = await this.getModel(id, organizationId);
    model.deprecate();

    const updated = await this.modelRepository.update(model);
    this.logger.log(`Model ${id} deprecated`);

    return updated;
  }

  /**
   * Delete a model
   */
  async deleteModel(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const model = await this.getModel(id, organizationId);
    await this.modelRepository.delete(model.id, organizationId);
    this.logger.log(`Model ${id} deleted`);
  }

  /**
   * Get best performing model
   */
  async getBestModel(
    organizationId: string,
    type?: ModelType,
  ): Promise<ForecastModel | null> {
    return this.modelRepository.getBestPerforming(organizationId, type);
  }

  /**
   * Calculate model performance metrics
   */
  private calculatePerformance(
    predicted: number[],
    actual: number[],
  ): ModelPerformance {
    if (predicted.length !== actual.length) {
      throw new Error('Predicted and actual arrays must have same length');
    }

    const n = predicted.length;
    let sumAbsoluteError = 0;
    let sumSquaredError = 0;
    let sumPercentageError = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      sumAbsoluteError += Math.abs(error);
      sumSquaredError += error * error;
      if (actual[i] !== 0) {
        sumPercentageError += Math.abs(error / actual[i]) * 100;
      }
    }

    const mae = sumAbsoluteError / n;
    const mse = sumSquaredError / n;
    const rmse = Math.sqrt(mse);
    const mape = sumPercentageError / n;

    // Calculate accuracy as (100 - MAPE)
    const accuracy = Math.max(0, Math.min(100, 100 - mape));

    // Calculate precision and recall (simplified for regression)
    const precision = accuracy;
    const recall = accuracy;
    const f1Score = (2 * precision * recall) / (precision + recall);

    return {
      accuracy: Math.round(accuracy * 100) / 100,
      precision: Math.round(precision * 100) / 100,
      recall: Math.round(recall * 100) / 100,
      f1Score: Math.round(f1Score * 100) / 100,
      validationMape: Math.round(mape * 100) / 100,
    };
  }
}
