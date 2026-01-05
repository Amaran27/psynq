import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Forecast,
  ForecastType,
  ForecastInterval,
  ForecastDataPoint,
} from '../domain/forecast.domain';
import {
  ForecastRepository,
  FORECAST_REPOSITORY,
} from '../ports/forecast.repository.port';
import {
  ForecastModelRepository,
  FORECAST_MODEL_REPOSITORY,
} from '../ports/forecast-model.repository.port';
import { ForecastingEngineService, TimeSeriesPoint } from './forecasting-engine.service';
import { CreateForecastDto } from '../dto/create-forecast.dto';
import { ForecastQueryDto } from '../dto/forecast-query.dto';
import { UpdateActualsDto } from '../dto/update-actuals.dto';

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(
    @Inject(FORECAST_REPOSITORY)
    private readonly forecastRepository: ForecastRepository,
    @Inject(FORECAST_MODEL_REPOSITORY)
    private readonly modelRepository: ForecastModelRepository,
    private readonly forecastingEngine: ForecastingEngineService,
  ) {}

  /**
   * Generate a new forecast using specified model
   */
  async generateForecast(
    organizationId: string,
    dto: CreateForecastDto,
    historicalData: TimeSeriesPoint[],
  ): Promise<Forecast> {
    this.logger.log(`Generating forecast for organization ${organizationId}`);

    // Validate model exists and is active
    const model = await this.modelRepository.findById(dto.modelId, organizationId);
    if (!model) {
      throw new NotFoundException('Forecast model not found');
    }

    if (!model.canPredict()) {
      throw new BadRequestException('Model is not active or not trained');
    }

    // Calculate number of forecast periods
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const periods = this.calculatePeriods(start, end, dto.interval);

    // Generate predictions based on model type
    let dataPoints: ForecastDataPoint[];
    try {
      switch (model.type) {
        case 'linear_regression':
          dataPoints = this.forecastingEngine.linearRegression(
            historicalData,
            periods,
          );
          break;
        case 'moving_average':
          const windowSize = model.hyperparameters?.windowSize || 7;
          dataPoints = this.forecastingEngine.movingAverage(
            historicalData,
            periods,
            windowSize,
          );
          break;
        case 'exponential_smoothing':
          const alpha = model.hyperparameters?.alpha || 0.3;
          dataPoints = this.forecastingEngine.exponentialSmoothing(
            historicalData,
            periods,
            alpha,
          );
          break;
        default:
          throw new BadRequestException(`Unsupported model type: ${model.type}`);
      }
    } catch (error) {
      this.logger.error(`Forecasting failed: ${error.message}`);
      throw new BadRequestException(`Forecasting failed: ${error.message}`);
    }

    // Create forecast domain model
    const forecast = new Forecast(
      uuidv4(),
      organizationId,
      dto.modelId,
      dto.name,
      dto.type,
      dto.interval,
      start,
      end,
      dataPoints,
      undefined,
      dto.metadata,
    );

    // Save forecast
    const saved = await this.forecastRepository.create(forecast);
    this.logger.log(`Forecast ${saved.id} created successfully`);

    return saved;
  }

  /**
   * Get forecast by ID
   */
  async getForecast(
    id: string,
    organizationId: string,
  ): Promise<Forecast> {
    const forecast = await this.forecastRepository.findById(id, organizationId);
    if (!forecast) {
      throw new NotFoundException('Forecast not found');
    }
    return forecast;
  }

  /**
   * List forecasts with filters
   */
  async listForecasts(
    organizationId: string,
    query: ForecastQueryDto,
  ): Promise<{ forecasts: Forecast[]; total: number }> {
    if (query.startDate && query.endDate) {
      const forecasts = await this.forecastRepository.findByDateRange(
        organizationId,
        new Date(query.startDate),
        new Date(query.endDate),
      );
      return { forecasts, total: forecasts.length };
    }

    if (query.modelId) {
      const forecasts = await this.forecastRepository.findByModel(
        query.modelId,
        organizationId,
      );
      return { forecasts, total: forecasts.length };
    }

    return this.forecastRepository.findByOrganization(organizationId, {
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  /**
   * Get latest forecast
   */
  async getLatestForecast(
    organizationId: string,
    type?: ForecastType,
  ): Promise<Forecast | null> {
    return this.forecastRepository.getLatest(organizationId, type);
  }

  /**
   * Update actual values for comparison
   */
  async updateActuals(
    id: string,
    organizationId: string,
    dto: UpdateActualsDto,
  ): Promise<Forecast> {
    const forecast = await this.getForecast(id, organizationId);

    const actuals = dto.actuals.map(a => ({
      timestamp: new Date(a.timestamp),
      value: a.value,
    }));

    forecast.addActualValues(actuals);
    const updated = await this.forecastRepository.update(forecast);

    this.logger.log(`Updated actuals for forecast ${id}`);
    return updated;
  }

  /**
   * Calculate accuracy metrics
   */
  async calculateAccuracy(
    id: string,
    organizationId: string,
  ): Promise<Forecast> {
    const forecast = await this.getForecast(id, organizationId);

    const accuracy = forecast.calculateAccuracy();
    if (!accuracy) {
      throw new BadRequestException('Cannot calculate accuracy without actual values');
    }

    const updated = await this.forecastRepository.update(forecast);
    this.logger.log(`Calculated accuracy for forecast ${id}: MAPE ${accuracy.mape}%`);

    return updated;
  }

  /**
   * Delete a forecast
   */
  async deleteForecast(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const forecast = await this.getForecast(id, organizationId);
    await this.forecastRepository.delete(forecast.id, organizationId);
    this.logger.log(`Forecast ${id} deleted`);
  }

  /**
   * Calculate number of periods between dates
   */
  private calculatePeriods(
    start: Date,
    end: Date,
    interval: ForecastInterval,
  ): number {
    const diff = end.getTime() - start.getTime();

    switch (interval) {
      case ForecastInterval.HOURLY:
        return Math.ceil(diff / (1000 * 60 * 60));
      case ForecastInterval.DAILY:
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
      case ForecastInterval.WEEKLY:
        return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
      case ForecastInterval.MONTHLY:
        return Math.ceil(diff / (1000 * 60 * 60 * 24 * 30));
      default:
        return 24; // Default to 24 periods
    }
  }
}
