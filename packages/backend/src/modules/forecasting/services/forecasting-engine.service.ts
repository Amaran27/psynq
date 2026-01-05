import { Injectable, Logger } from '@nestjs/common';
import { ForecastDataPoint } from '../domain/forecast.domain';

/**
 * Time series data point for forecasting
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

/**
 * Forecasting Engine Service
 * 
 * Implements various forecasting algorithms for demand prediction
 */
@Injectable()
export class ForecastingEngineService {
  private readonly logger = new Logger(ForecastingEngineService.name);

  /**
   * Linear Regression Forecast
   * Simple trend-based forecasting
   */
  linearRegression(
    historicalData: TimeSeriesPoint[],
    forecastPeriods: number,
  ): ForecastDataPoint[] {
    if (historicalData.length < 2) {
      throw new Error('Linear regression requires at least 2 data points');
    }

    // Calculate slope and intercept
    const n = historicalData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    historicalData.forEach((point, index) => {
      const x = index;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecasts
    const forecasts: ForecastDataPoint[] = [];
    const lastTimestamp = historicalData[historicalData.length - 1].timestamp;
    const interval = this.calculateInterval(historicalData);

    for (let i = 1; i <= forecastPeriods; i++) {
      const x = n + i - 1;
      const predicted = slope * x + intercept;
      const timestamp = new Date(lastTimestamp.getTime() + interval * i);

      // Calculate confidence interval (simple approach)
      const stdDev = this.calculateStandardDeviation(historicalData);
      const confidence = Math.max(60, Math.min(95, 100 - (stdDev / predicted) * 100));

      forecasts.push({
        timestamp,
        predicted: Math.max(0, Math.round(predicted * 100) / 100),
        confidence,
        lowerBound: Math.max(0, Math.round((predicted - stdDev) * 100) / 100),
        upperBound: Math.round((predicted + stdDev) * 100) / 100,
      });
    }

    return forecasts;
  }

  /**
   * Moving Average Forecast
   * Simple moving average for trend smoothing
   */
  movingAverage(
    historicalData: TimeSeriesPoint[],
    forecastPeriods: number,
    windowSize: number = 7,
  ): ForecastDataPoint[] {
    if (historicalData.length < windowSize) {
      throw new Error(`Moving average requires at least ${windowSize} data points`);
    }

    const forecasts: ForecastDataPoint[] = [];
    const lastTimestamp = historicalData[historicalData.length - 1].timestamp;
    const interval = this.calculateInterval(historicalData);

    // Calculate initial moving average
    let movingAvg = this.calculateMovingAverage(historicalData, windowSize);

    for (let i = 1; i <= forecastPeriods; i++) {
      const timestamp = new Date(lastTimestamp.getTime() + interval * i);
      const stdDev = this.calculateStandardDeviation(
        historicalData.slice(-windowSize),
      );
      const confidence = Math.max(60, Math.min(95, 100 - (stdDev / movingAvg) * 100));

      forecasts.push({
        timestamp,
        predicted: Math.max(0, Math.round(movingAvg * 100) / 100),
        confidence,
        lowerBound: Math.max(0, Math.round((movingAvg - stdDev) * 100) / 100),
        upperBound: Math.round((movingAvg + stdDev) * 100) / 100,
      });

      // Update moving average for next period (using previous forecast)
      movingAvg = movingAvg; // Keep constant for simplicity
    }

    return forecasts;
  }

  /**
   * Exponential Smoothing Forecast
   * Weighted average with exponential decay
   */
  exponentialSmoothing(
    historicalData: TimeSeriesPoint[],
    forecastPeriods: number,
    alpha: number = 0.3,
  ): ForecastDataPoint[] {
    if (historicalData.length < 1) {
      throw new Error('Exponential smoothing requires at least 1 data point');
    }

    if (alpha < 0 || alpha > 1) {
      throw new Error('Alpha must be between 0 and 1');
    }

    // Calculate smoothed values
    let smoothed = historicalData[0].value;
    for (let i = 1; i < historicalData.length; i++) {
      smoothed = alpha * historicalData[i].value + (1 - alpha) * smoothed;
    }

    // Generate forecasts
    const forecasts: ForecastDataPoint[] = [];
    const lastTimestamp = historicalData[historicalData.length - 1].timestamp;
    const interval = this.calculateInterval(historicalData);
    const stdDev = this.calculateStandardDeviation(historicalData);

    for (let i = 1; i <= forecastPeriods; i++) {
      const timestamp = new Date(lastTimestamp.getTime() + interval * i);
      const confidence = Math.max(60, Math.min(95, 100 - (stdDev / smoothed) * 100));

      forecasts.push({
        timestamp,
        predicted: Math.max(0, Math.round(smoothed * 100) / 100),
        confidence,
        lowerBound: Math.max(0, Math.round((smoothed - stdDev) * 100) / 100),
        upperBound: Math.round((smoothed + stdDev) * 100) / 100,
      });
    }

    return forecasts;
  }

  /**
   * Calculate standard deviation of values
   */
  private calculateStandardDeviation(data: TimeSeriesPoint[]): number {
    if (data.length === 0) return 0;

    const values = data.map(p => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate moving average for last N points
   */
  private calculateMovingAverage(
    data: TimeSeriesPoint[],
    windowSize: number,
  ): number {
    const window = data.slice(-windowSize);
    const sum = window.reduce((acc, point) => acc + point.value, 0);
    return sum / windowSize;
  }

  /**
   * Calculate time interval between data points (in milliseconds)
   */
  private calculateInterval(data: TimeSeriesPoint[]): number {
    if (data.length < 2) return 3600000; // Default: 1 hour

    // Calculate average interval
    let totalInterval = 0;
    for (let i = 1; i < Math.min(10, data.length); i++) {
      totalInterval += data[i].timestamp.getTime() - data[i - 1].timestamp.getTime();
    }

    return totalInterval / Math.min(9, data.length - 1);
  }

  /**
   * Detect seasonality in time series data
   */
  detectSeasonality(data: TimeSeriesPoint[]): {
    hasSeasonality: boolean;
    period?: number;
  } {
    if (data.length < 14) {
      return { hasSeasonality: false };
    }

    // Simple autocorrelation check for daily/weekly patterns
    const values = data.map(p => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Check for weekly pattern (7 days)
    const lag7Correlation = this.calculateAutocorrelation(values, mean, 7);
    if (lag7Correlation > 0.5) {
      return { hasSeasonality: true, period: 7 };
    }

    // Check for daily pattern (24 hours)
    const lag24Correlation = this.calculateAutocorrelation(values, mean, 24);
    if (lag24Correlation > 0.5) {
      return { hasSeasonality: true, period: 24 };
    }

    return { hasSeasonality: false };
  }

  /**
   * Calculate autocorrelation at specific lag
   */
  private calculateAutocorrelation(
    values: number[],
    mean: number,
    lag: number,
  ): number {
    if (lag >= values.length) return 0;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < values.length - lag; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Remove outliers from time series data
   */
  removeOutliers(
    data: TimeSeriesPoint[],
    threshold: number = 3,
  ): TimeSeriesPoint[] {
    if (data.length < 3) return data;

    const values = data.map(p => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length,
    );

    return data.filter(point => {
      const zScore = Math.abs((point.value - mean) / stdDev);
      return zScore <= threshold;
    });
  }

  /**
   * Normalize data for ML algorithms
   */
  normalizeData(data: TimeSeriesPoint[]): {
    normalized: TimeSeriesPoint[];
    min: number;
    max: number;
  } {
    if (data.length === 0) {
      return { normalized: [], min: 0, max: 0 };
    }

    const values = data.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      return {
        normalized: data.map(p => ({ ...p, value: 0.5 })),
        min,
        max,
      };
    }

    const normalized = data.map(point => ({
      timestamp: point.timestamp,
      value: (point.value - min) / range,
    }));

    return { normalized, min, max };
  }
}
