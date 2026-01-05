import { Forecast } from '../domain/forecast.domain';

export interface ForecastRepository {
  /**
   * Create a new forecast
   */
  create(forecast: Forecast): Promise<Forecast>;

  /**
   * Find forecast by ID
   */
  findById(id: string, organizationId: string): Promise<Forecast | null>;

  /**
   * Find all forecasts for an organization
   */
  findByOrganization(
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'startDate';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ forecasts: Forecast[]; total: number }>;

  /**
   * Find forecasts by model
   */
  findByModel(
    modelId: string,
    organizationId: string,
  ): Promise<Forecast[]>;

  /**
   * Find forecasts within date range
   */
  findByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Forecast[]>;

  /**
   * Update an existing forecast
   */
  update(forecast: Forecast): Promise<Forecast>;

  /**
   * Delete a forecast
   */
  delete(id: string, organizationId: string): Promise<void>;

  /**
   * Get the latest forecast for an organization
   */
  getLatest(
    organizationId: string,
    type?: string,
  ): Promise<Forecast | null>;
}

export const FORECAST_REPOSITORY = Symbol('FORECAST_REPOSITORY');
