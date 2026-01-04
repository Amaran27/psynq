/**
 * Wallet Repository Adapter (TypeORM)
 * 
 * Implements WalletRepository port using TypeORM
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletRepository } from '../../../domain/ports';
import { Wallet, WalletType, WalletStatus, Currency } from '../../../domain/wallet.domain';
import { WalletEntity } from '../entities/wallet.entity';

@Injectable()
export class WalletRepositoryAdapter implements WalletRepository {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly repository: Repository<WalletEntity>,
  ) {}

  async create(wallet: Wallet): Promise<Wallet> {
    const entity = this.toEntity(wallet);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Wallet | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCustomer(organizationId: string, customerId: string): Promise<Wallet | null> {
    const entity = await this.repository.findOne({
      where: { organizationId, customerId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganization(
    organizationId: string,
    filters?: { type?: string; status?: string; currency?: string }
  ): Promise<Wallet[]> {
    const query = this.repository.createQueryBuilder('wallet')
      .where('wallet.organizationId = :organizationId', { organizationId });

    if (filters?.type) {
      query.andWhere('wallet.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      query.andWhere('wallet.status = :status', { status: filters.status });
    }
    if (filters?.currency) {
      query.andWhere('wallet.currency = :currency', { currency: filters.currency });
    }

    const entities = await query.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findLowBalance(organizationId: string): Promise<Wallet[]> {
    const entities = await this.repository.createQueryBuilder('wallet')
      .where('wallet.organizationId = :organizationId', { organizationId })
      .andWhere('wallet.status = :status', { status: 'active' })
      .andWhere('wallet.balance < wallet.lowBalanceThreshold')
      .getMany();

    return entities.map(e => this.toDomain(e));
  }

  async findNeedingAutoRecharge(organizationId: string): Promise<Wallet[]> {
    const entities = await this.repository.createQueryBuilder('wallet')
      .where('wallet.organizationId = :organizationId', { organizationId })
      .andWhere('wallet.status = :status', { status: 'active' })
      .andWhere('wallet.autoRecharge = :autoRecharge', { autoRecharge: true })
      .andWhere('wallet.balance <= wallet.autoRechargeTrigger')
      .getMany();

    return entities.map(e => this.toDomain(e));
  }

  async update(wallet: Wallet): Promise<Wallet> {
    const entity = this.toEntity(wallet);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async getStatistics(organizationId: string): Promise<{
    totalWallets: number;
    activeWallets: number;
    totalBalance: number;
    lowBalanceCount: number;
    blockedCount: number;
  }> {
    const query = this.repository.createQueryBuilder('wallet')
      .select('COUNT(*)', 'totalWallets')
      .addSelect("COUNT(CASE WHEN status = 'active' THEN 1 END)", 'activeWallets')
      .addSelect('COALESCE(SUM(balance), 0)', 'totalBalance')
      .addSelect('COUNT(CASE WHEN balance < low_balance_threshold AND status = \'active\' THEN 1 END)', 'lowBalanceCount')
      .addSelect("COUNT(CASE WHEN status = 'blocked' THEN 1 END)", 'blockedCount')
      .where('wallet.organizationId = :organizationId', { organizationId });

    const result = await query.getRawOne();

    return {
      totalWallets: parseInt(result.totalWallets) || 0,
      activeWallets: parseInt(result.activeWallets) || 0,
      totalBalance: parseFloat(result.totalBalance) || 0,
      lowBalanceCount: parseInt(result.lowBalanceCount) || 0,
      blockedCount: parseInt(result.blockedCount) || 0,
    };
  }

  private toEntity(domain: Wallet): WalletEntity {
    const entity = new WalletEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.customerId = domain.customerId;
    entity.type = domain.type;
    entity.currency = domain.currency;
    entity.balance = domain.balance;
    entity.creditLimit = domain.creditLimit;
    entity.lowBalanceThreshold = domain.lowBalanceThreshold;
    entity.status = domain.status;
    entity.autoRecharge = domain.autoRecharge;
    entity.autoRechargeAmount = domain.autoRechargeAmount ?? null;
    entity.autoRechargeTrigger = domain.autoRechargeTrigger ?? null;
    entity.metadata = domain.metadata ?? null;
    if (domain.createdAt) entity.createdAt = domain.createdAt;
    if (domain.updatedAt) entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: WalletEntity): Wallet {
    return new Wallet(
      entity.id,
      entity.organizationId,
      entity.customerId,
      entity.type as WalletType,
      entity.currency as Currency,
      parseFloat(entity.balance.toString()),
      parseFloat(entity.creditLimit.toString()),
      parseFloat(entity.lowBalanceThreshold.toString()),
      entity.status as WalletStatus,
      entity.autoRecharge,
      entity.autoRechargeAmount ? parseFloat(entity.autoRechargeAmount.toString()) : undefined,
      entity.autoRechargeTrigger ? parseFloat(entity.autoRechargeTrigger.toString()) : undefined,
      entity.metadata || undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
