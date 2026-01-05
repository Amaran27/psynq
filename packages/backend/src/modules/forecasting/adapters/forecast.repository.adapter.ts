import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForecastRepository } from '../ports/forecast.repository.port';
import { Forecast, ForecastDataPoint } from '../domain/forecast.domain';
import { ForecastEntity } from '../entities/forecast.entity';

@Injectable()
export class ForecastRepositoryAdapter implements ForecastRepository {
  constructor(
    @InjectRepository(ForecastEntity)
    private readonly repository: Repository<ForecastEntity>,
  ) {}

  async create(forecast: Forecast): Promise<Forecast> {
    const entity = this.toEntity(forecast);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string, organizationId: string): Promise<Forecast | null> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganization(
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'startDate';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ forecasts: Forecast[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('forecast')
      .where('forecast.organizationId = :organizationId', { organizationId });

    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    query.orderBy(`forecast.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    if (options?.limit) {
      query.take(options.limit);
    }
    if (options?.offset) {
      query.skip(options.offset);
    }

    const [entities, total] = await query.getManyAndCount();
    const forecasts = entities.map(e => this.toDomain(e));

    return { forecasts, total };
  }

  async findByModel(
    modelId: string,
    organizationId: string,
  ): Promise<Forecast[]> {
    const entities = await this.repository.find({
      where: { modelId, organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Forecast[]> {
    const entities = await this.repository
      .createQueryBuilder('forecast')
      .where('forecast.organizationId = :organizationId', { organizationId })
      .andWhere('forecast.startDate >= :startDate', { startDate })
      .andWhere('forecast.endDate <= :endDate', { endDate })
      .orderBy('forecast.startDate', 'ASC')
      .getMany();

    return entities.map(e => this.toDomain(e));
  }

  async update(forecast: Forecast): Promise<Forecast> {
    const entity = this.toEntity(forecast);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

  async getLatest(
    organizationId: string,
    type?: string,
  ): Promise<Forecast | null> {
    const query = this.repository
      .createQueryBuilder('forecast')
      .where('forecast.organizationId = :organizationId', { organizationId });

    if (type) {
      query.andWhere('forecast.type = :type', { type });
    }

    const entity = await query
      .orderBy('forecast.createdAt', 'DESC')
      .getOne();

    return entity ? this.toDomain(entity) : null;
  }

  private toEntity(forecast: Forecast): ForecastEntity {
    const entity = new ForecastEntity();
    entity.id = forecast.id;
    entity.organizationId = forecast.organizationId;
    entity.modelId = forecast.modelId;
    entity.name = forecast.name;
    entity.type = forecast.type;
    entity.interval = forecast.interval;
    entity.startDate = forecast.startDate;
    entity.endDate = forecast.endDate;
    entity.dataPoints = forecast.dataPoints.map(p => ({
      ...p,
      timestamp: p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp),
    }));
    entity.accuracy = forecast.accuracy;
    entity.metadata = forecast.metadata;
    if (forecast.createdAt) entity.createdAt = forecast.createdAt;
    if (forecast.updatedAt) entity.updatedAt = forecast.updatedAt;
    return entity;
  }

  private toDomain(entity: ForecastEntity): Forecast {
    const dataPoints: ForecastDataPoint[] = entity.dataPoints.map(p => ({
      ...p,
      timestamp: p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp),
    }));

    return new Forecast(
      entity.id,
      entity.organizationId,
      entity.modelId,
      entity.name,
      entity.type,
      entity.interval,
      entity.startDate instanceof Date ? entity.startDate : new Date(entity.startDate),
      entity.endDate instanceof Date ? entity.endDate : new Date(entity.endDate),
      dataPoints,
      entity.accuracy,
      entity.metadata,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
