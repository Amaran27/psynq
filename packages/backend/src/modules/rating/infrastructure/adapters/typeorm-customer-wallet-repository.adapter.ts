import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerWalletRepository, FindWalletsFilter } from '../../domain/ports/customer-wallet-repository.port';
import { CustomerWallet } from '../../domain/customer-wallet.domain';
import { CustomerWalletEntity } from '../persistence/customer-wallet.entity';

@Injectable()
export class TypeOrmCustomerWalletRepositoryAdapter implements CustomerWalletRepository {
  constructor(
    @InjectRepository(CustomerWalletEntity)
    private readonly repository: Repository<CustomerWalletEntity>,
  ) {}

  async create(wallet: CustomerWallet): Promise<CustomerWallet> {
    const entity = this.toEntity(wallet);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<CustomerWallet | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindWalletsFilter): Promise<CustomerWallet[]> {
    const queryBuilder = this.repository.createQueryBuilder('wallet');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.andWhere('wallet.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.customerId) {
        queryBuilder.andWhere('wallet.customer_id = :customerId', {
          customerId: filter.customerId,
        });
      }

      if (filter.status) {
        queryBuilder.andWhere('wallet.status = :status', { status: filter.status });
      }

      if (filter.lowBalance) {
        queryBuilder.andWhere('wallet.balance <= wallet.low_balance_threshold');
      }
    }

    queryBuilder.orderBy('wallet.created_at', 'DESC');
    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByCustomer(organizationId: string, customerId: string): Promise<CustomerWallet | null> {
    const entity = await this.repository.findOne({
      where: { organizationId, customerId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findLowBalance(organizationId: string): Promise<CustomerWallet[]> {
    return this.findAll({ organizationId, lowBalance: true });
  }

  async findAutoRechargeEligible(organizationId: string): Promise<CustomerWallet[]> {
    const queryBuilder = this.repository.createQueryBuilder('wallet');
    queryBuilder
      .where('wallet.organization_id = :organizationId', { organizationId })
      .andWhere('wallet.auto_recharge = true')
      .andWhere('wallet.status = :status', { status: 'active' })
      .andWhere('wallet.balance <= wallet.auto_recharge_threshold');

    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(wallet: CustomerWallet): Promise<CustomerWallet> {
    const entity = this.toEntity(wallet);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindWalletsFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('wallet');

    if (filter) {
      if (filter.organizationId) {
        queryBuilder.andWhere('wallet.organization_id = :organizationId', {
          organizationId: filter.organizationId,
        });
      }

      if (filter.status) {
        queryBuilder.andWhere('wallet.status = :status', { status: filter.status });
      }
    }

    return queryBuilder.getCount();
  }

  private toEntity(domain: CustomerWallet): CustomerWalletEntity {
    const entity = new CustomerWalletEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.customerId = domain.customerId;
    entity.balance = domain.balance;
    entity.currency = domain.currency;
    entity.status = domain.status;
    entity.lowBalanceThreshold = domain.lowBalanceThreshold;
    entity.autoRecharge = domain.autoRecharge;
    entity.autoRechargeAmount = domain.autoRechargeAmount || null;
    entity.autoRechargeThreshold = domain.autoRechargeThreshold || null;
    entity.lastRechargeDate = domain.lastRechargeDate || null;
    entity.lastDebitDate = domain.lastDebitDate || null;
    entity.totalCredited = domain.totalCredited;
    entity.totalDebited = domain.totalDebited;
    entity.totalRefunded = domain.totalRefunded;
    entity.lifetimeValue = domain.lifetimeValue;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: CustomerWalletEntity): CustomerWallet {
    return new CustomerWallet(
      entity.id,
      entity.organizationId,
      entity.customerId,
      entity.balance,
      entity.currency,
      entity.status,
      entity.lowBalanceThreshold,
      entity.autoRecharge,
      entity.autoRechargeAmount ?? undefined,
      entity.autoRechargeThreshold ?? undefined,
      entity.lastRechargeDate ?? undefined,
      entity.lastDebitDate ?? undefined,
      entity.totalCredited,
      entity.totalDebited,
      entity.totalRefunded,
      entity.lifetimeValue,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
