import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RatePlanRepository, FindRatePlansFilter } from '../../domain/ports/rate-plan-repository.port';
import { RatePlan } from '../../domain/rate-plan.domain';
import { RatePlanEntity } from '../persistence/rate-plan.entity';

@Injectable()
export class TypeOrmRatePlanRepositoryAdapter implements RatePlanRepository {
  constructor(
    @InjectRepository(RatePlanEntity)
    private readonly repository: Repository<RatePlanEntity>,
  ) {}

  async create(ratePlan: RatePlan): Promise<RatePlan> {
    const entity = this.toEntity(ratePlan);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<RatePlan | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindRatePlansFilter): Promise<RatePlan[]> {
    const queryBuilder = this.repository.createQueryBuilder('rate_plan');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.andWhere('rate_plan.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.type) {
        queryBuilder.andWhere('rate_plan.type = :type', { type: filter.type });
      }

      if (filter.status) {
        queryBuilder.andWhere('rate_plan.status = :status', { status: filter.status });
      }

      if (filter.isActive !== undefined) {
        if (filter.isActive) {
          queryBuilder
            .andWhere('rate_plan.status = :activeStatus', { activeStatus: 'active' })
            .andWhere(
              '(rate_plan.effective_from IS NULL OR rate_plan.effective_from <= NOW())',
            )
            .andWhere(
              '(rate_plan.effective_to IS NULL OR rate_plan.effective_to >= NOW())',
            );
        }
      }
    }

    queryBuilder.orderBy('rate_plan.created_at', 'DESC');
    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByOrganization(organizationId: string): Promise<RatePlan[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findActive(organizationId: string): Promise<RatePlan[]> {
    return this.findAll({ organizationId, isActive: true });
  }

  async update(ratePlan: RatePlan): Promise<RatePlan> {
    const entity = this.toEntity(ratePlan);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindRatePlansFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('rate_plan');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.andWhere('rate_plan.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.type) {
        queryBuilder.andWhere('rate_plan.type = :type', { type: filter.type });
      }

      if (filter.status) {
        queryBuilder.andWhere('rate_plan.status = :status', { status: filter.status });
      }
    }

    return queryBuilder.getCount();
  }

  private toEntity(domain: RatePlan): RatePlanEntity {
    const entity = new RatePlanEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.name = domain.name;
    entity.type = domain.type;
    entity.status = domain.status;
    entity.description = domain.description || null;
    entity.chargeType = domain.chargeType;
    entity.baseRate = domain.baseRate;
    entity.minimumCharge = domain.minimumCharge;
    entity.roundingMethod = domain.roundingMethod;
    entity.roundingIncrement = domain.roundingIncrement;
    entity.freeSeconds = domain.freeSeconds;
    entity.currency = domain.currency;
    entity.billingCycle = domain.billingCycle;
    entity.gracePeriodDays = domain.gracePeriodDays;
    entity.lowBalanceThreshold = domain.lowBalanceThreshold;
    entity.autoRecharge = domain.autoRecharge;
    entity.autoRechargeAmount = domain.autoRechargeAmount || null;
    entity.autoRechargeThreshold = domain.autoRechargeThreshold || null;
    entity.effectiveFrom = domain.effectiveFrom || null;
    entity.effectiveTo = domain.effectiveTo || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: RatePlanEntity): RatePlan {
    return new RatePlan(
      entity.id,
      entity.organizationId,
      entity.name,
      entity.type,
      entity.status,
      entity.description ?? undefined,
      entity.chargeType,
      entity.baseRate,
      entity.minimumCharge,
      entity.roundingMethod,
      entity.roundingIncrement,
      entity.freeSeconds,
      entity.currency,
      entity.billingCycle,
      entity.gracePeriodDays,
      entity.lowBalanceThreshold,
      entity.autoRecharge,
      entity.autoRechargeAmount ?? undefined,
      entity.autoRechargeThreshold ?? undefined,
      entity.effectiveFrom ?? undefined,
      entity.effectiveTo ?? undefined,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
