import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForecastModelRepository } from '../ports/forecast-model.repository.port';
import { ForecastModel, ModelStatus, ModelType } from '../domain/forecast-model.domain';
import { ForecastModelEntity } from '../entities/forecast-model.entity';

@Injectable()
export class ForecastModelRepositoryAdapter implements ForecastModelRepository {
  constructor(
    @InjectRepository(ForecastModelEntity)
    private readonly repository: Repository<ForecastModelEntity>,
  ) {}

  async create(model: ForecastModel): Promise<ForecastModel> {
    const entity = this.toEntity(model);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string, organizationId: string): Promise<ForecastModel | null> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganization(
    organizationId: string,
    options?: {
      status?: ModelStatus;
      type?: ModelType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ models: ForecastModel[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('model')
      .where('model.organizationId = :organizationId', { organizationId });

    if (options?.status) {
      query.andWhere('model.status = :status', { status: options.status });
    }

    if (options?.type) {
      query.andWhere('model.type = :type', { type: options.type });
    }

    query.orderBy('model.createdAt', 'DESC');

    if (options?.limit) {
      query.take(options.limit);
    }
    if (options?.offset) {
      query.skip(options.offset);
    }

    const [entities, total] = await query.getManyAndCount();
    const models = entities.map(e => this.toDomain(e));

    return { models, total };
  }

  async findActiveModels(organizationId: string): Promise<ForecastModel[]> {
    const entities = await this.repository.find({
      where: { organizationId, status: ModelStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByType(
    organizationId: string,
    type: ModelType,
  ): Promise<ForecastModel[]> {
    const entities = await this.repository.find({
      where: { organizationId, type },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async update(model: ForecastModel): Promise<ForecastModel> {
    const entity = this.toEntity(model);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

  async getBestPerforming(
    organizationId: string,
    type?: ModelType,
  ): Promise<ForecastModel | null> {
    const query = this.repository
      .createQueryBuilder('model')
      .where('model.organizationId = :organizationId', { organizationId })
      .andWhere('model.status = :status', { status: ModelStatus.ACTIVE })
      .andWhere('model.performance IS NOT NULL');

    if (type) {
      query.andWhere('model.type = :type', { type });
    }

    // Sort by accuracy (descending)
    const entity = await query
      .orderBy("(model.performance->>'accuracy')::numeric", 'DESC')
      .getOne();

    return entity ? this.toDomain(entity) : null;
  }

  private toEntity(model: ForecastModel): ForecastModelEntity {
    const entity = new ForecastModelEntity();
    entity.id = model.id;
    entity.organizationId = model.organizationId;
    entity.name = model.name;
    entity.description = model.description;
    entity.type = model.type;
    entity.status = model.status;
    entity.trainingData = {
      ...model.trainingData,
      startDate: model.trainingData.startDate instanceof Date
        ? model.trainingData.startDate
        : new Date(model.trainingData.startDate),
      endDate: model.trainingData.endDate instanceof Date
        ? model.trainingData.endDate
        : new Date(model.trainingData.endDate),
    };
    entity.performance = model.performance;
    entity.version = model.version;
    entity.hyperparameters = model.hyperparameters;
    entity.metadata = model.metadata;
    if (model.createdAt) entity.createdAt = model.createdAt;
    if (model.updatedAt) entity.updatedAt = model.updatedAt;
    if (model.trainedAt) entity.trainedAt = model.trainedAt;
    return entity;
  }

  private toDomain(entity: ForecastModelEntity): ForecastModel {
    return new ForecastModel(
      entity.id,
      entity.organizationId,
      entity.name,
      entity.description,
      entity.type,
      entity.status,
      {
        ...entity.trainingData,
        startDate: entity.trainingData.startDate instanceof Date
          ? entity.trainingData.startDate
          : new Date(entity.trainingData.startDate),
        endDate: entity.trainingData.endDate instanceof Date
          ? entity.trainingData.endDate
          : new Date(entity.trainingData.endDate),
      },
      entity.version,
      entity.hyperparameters,
      entity.performance,
      entity.metadata,
      entity.createdAt,
      entity.updatedAt,
      entity.trainedAt,
    );
  }
}
