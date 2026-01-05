/**
 * Forecast Domain Model
 * 
 * Represents call volume predictions for workforce planning
 */

export enum ForecastInterval {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ForecastType {
  CALLS = 'calls',               // Incoming call volume
  AHT = 'aht',                   // Average Handle Time
  OCCUPANCY = 'occupancy',       // Agent occupancy rate
  ABANDONMENT = 'abandonment',   // Abandonment rate
}

export interface ForecastDataPoint {
  timestamp: Date;
  predicted: number;
  actual?: number;              // Actual value (for comparison)
  lowerBound?: number;          // Confidence interval lower
  upperBound?: number;          // Confidence interval upper
  confidence: number;           // Prediction confidence (0-100%)
}

export interface AccuracyMetrics {
  mape: number;                 // Mean Absolute Percentage Error
  rmse: number;                 // Root Mean Square Error
  mae: number;                  // Mean Absolute Error
  r2Score: number;              // R-squared coefficient
}

export class Forecast {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly modelId: string,
    public name: string,
    public type: ForecastType,
    public interval: ForecastInterval,
    public startDate: Date,
    public endDate: Date,
    public dataPoints: ForecastDataPoint[],
    public accuracy?: AccuracyMetrics,
    public metadata?: Record<string, any>,
    public readonly createdAt?: Date,
    public updatedAt?: Date,
  ) {
    this.validateForecast();
  }

  private validateForecast(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Forecast name is required');
    }

    if (this.startDate >= this.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (this.dataPoints.length === 0) {
      throw new Error('Forecast must have at least one data point');
    }

    // Validate data points are within forecast range
    for (const point of this.dataPoints) {
      if (point.timestamp < this.startDate || point.timestamp > this.endDate) {
        throw new Error('Data point timestamp outside forecast range');
      }
      if (point.confidence < 0 || point.confidence > 100) {
        throw new Error('Confidence must be between 0 and 100');
      }
      if (point.predicted < 0) {
        throw new Error('Predicted value cannot be negative');
      }
    }
  }

  /**
   * Update forecast metadata
   */
  update(updates: {
    name?: string;
    dataPoints?: ForecastDataPoint[];
    accuracy?: AccuracyMetrics;
  }): void {
    if (updates.name !== undefined) {
      this.name = updates.name;
    }
    if (updates.dataPoints !== undefined) {
      this.dataPoints = updates.dataPoints;
    }
    if (updates.accuracy !== undefined) {
      this.accuracy = updates.accuracy;
    }

    this.updatedAt = new Date();
    this.validateForecast();
  }

  /**
   * Add actual values to compare with predictions
   */
  addActualValues(actuals: Array<{ timestamp: Date; value: number }>): void {
    for (const actual of actuals) {
      const point = this.dataPoints.find(
        p => p.timestamp.getTime() === actual.timestamp.getTime(),
      );
      if (point) {
        point.actual = actual.value;
      }
    }
    this.updatedAt = new Date();
  }

  /**
   * Calculate accuracy metrics based on actual vs predicted
   */
  calculateAccuracy(): AccuracyMetrics | null {
    const validPoints = this.dataPoints.filter(p => p.actual !== undefined);
    if (validPoints.length === 0) {
      return null;
    }

    let sumAbsoluteError = 0;
    let sumSquaredError = 0;
    let sumPercentageError = 0;
    let sumActual = 0;
    let sumPredicted = 0;

    for (const point of validPoints) {
      const error = point.actual! - point.predicted;
      sumAbsoluteError += Math.abs(error);
      sumSquaredError += error * error;
      sumPercentageError += Math.abs(error / point.actual!) * 100;
      sumActual += point.actual!;
      sumPredicted += point.predicted;
    }

    const n = validPoints.length;
    const mae = sumAbsoluteError / n;
    const mape = sumPercentageError / n;
    const rmse = Math.sqrt(sumSquaredError / n);

    // Calculate R-squared
    const meanActual = sumActual / n;
    let ssTot = 0;
    let ssRes = 0;
    for (const point of validPoints) {
      ssTot += Math.pow(point.actual! - meanActual, 2);
      ssRes += Math.pow(point.actual! - point.predicted, 2);
    }
    const r2Score = 1 - (ssRes / ssTot);

    this.accuracy = {
      mae: Math.round(mae * 100) / 100,
      mape: Math.round(mape * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      r2Score: Math.round(r2Score * 1000) / 1000,
    };

    return this.accuracy;
  }

  /**
   * Get data points for a specific time range
   */
  getDataPointsInRange(start: Date, end: Date): ForecastDataPoint[] {
    return this.dataPoints.filter(
      p => p.timestamp >= start && p.timestamp <= end,
    );
  }

  /**
   * Get average predicted value
   */
  getAveragePrediction(): number {
    if (this.dataPoints.length === 0) return 0;
    const sum = this.dataPoints.reduce((acc, p) => acc + p.predicted, 0);
    return Math.round((sum / this.dataPoints.length) * 100) / 100;
  }

  /**
   * Get peak predicted value
   */
  getPeakPrediction(): { value: number; timestamp: Date } | null {
    if (this.dataPoints.length === 0) return null;
    const peak = this.dataPoints.reduce((max, p) =>
      p.predicted > max.predicted ? p : max,
    );
    return { value: peak.predicted, timestamp: peak.timestamp };
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalPoints: number;
    averagePrediction: number;
    peakPrediction: number;
    hasActuals: boolean;
    averageConfidence: number;
  } {
    const hasActuals = this.dataPoints.some(p => p.actual !== undefined);
    const avgConfidence = this.dataPoints.reduce((sum, p) => sum + p.confidence, 0) / this.dataPoints.length;

    return {
      totalPoints: this.dataPoints.length,
      averagePrediction: this.getAveragePrediction(),
      peakPrediction: this.getPeakPrediction()?.value || 0,
      hasActuals,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
    };
  }
}
