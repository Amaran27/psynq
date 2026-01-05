import { ForecastModel, ModelStatus, ModelType } from '../domain/forecast-model.domain';

export interface ForecastModelRepository {
  /**
   * Create a new forecast model
   */
  create(model: ForecastModel): Promise<ForecastModel>;

  /**
   * Find model by ID
   */
  findById(id: string, organizationId: string): Promise<ForecastModel | null>;

  /**
   * Find all models for an organization
   */
  findByOrganization(
    organizationId: string,
    options?: {
      status?: ModelStatus;
      type?: ModelType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ models: ForecastModel[]; total: number }>;

  /**
   * Find active models for an organization
   */
  findActiveModels(organizationId: string): Promise<ForecastModel[]>;

  /**
   * Find models by type
   */
  findByType(
    organizationId: string,
    type: ModelType,
  ): Promise<ForecastModel[]>;

  /**
   * Update an existing model
   */
  update(model: ForecastModel): Promise<ForecastModel>;

  /**
   * Delete a model
   */
  delete(id: string, organizationId: string): Promise<void>;

  /**
   * Get the best performing model for an organization
   */
  getBestPerforming(
    organizationId: string,
    type?: ModelType,
  ): Promise<ForecastModel | null>;
}

export const FORECAST_MODEL_REPOSITORY = Symbol('FORECAST_MODEL_REPOSITORY');
