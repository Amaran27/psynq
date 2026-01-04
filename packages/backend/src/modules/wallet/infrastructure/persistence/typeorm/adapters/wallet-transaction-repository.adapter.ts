/**
 * Wallet Transaction Repository Adapter (TypeORM)
 * 
 * Implements WalletTransactionRepository port using TypeORM
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WalletTransactionRepository } from '../../../domain/ports';
import { WalletTransaction, TransactionType, TransactionStatus } from '../../../domain/wallet-transaction.domain';
import { WalletTransactionEntity } from '../entities/wallet-transaction.entity';

@Injectable()
export class WalletTransactionRepositoryAdapter implements WalletTransactionRepository {
  constructor(
    @InjectRepository(WalletTransactionEntity)
    private readonly repository: Repository<WalletTransactionEntity>,
  ) {}

  async create(transaction: WalletTransaction): Promise<WalletTransaction> {
    const entity = this.toEntity(transaction);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<WalletTransaction | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByWallet(
    walletId: string,
    filters?: {
      type?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<WalletTransaction[]> {
    const query = this.repository.createQueryBuilder('tx')
      .where('tx.walletId = :walletId', { walletId })
      .orderBy('tx.createdAt', 'DESC');

    if (filters?.type) {
      query.andWhere('tx.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      query.andWhere('tx.status = :status', { status: filters.status });
    }
    if (filters?.startDate && filters?.endDate) {
      query.andWhere('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }
    if (filters?.limit) {
      query.take(filters.limit);
    }
    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const entities = await query.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findByOrganization(
    organizationId: string,
    filters?: {
      type?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<WalletTransaction[]> {
    const query = this.repository.createQueryBuilder('tx')
      .where('tx.organizationId = :organizationId', { organizationId })
      .orderBy('tx.createdAt', 'DESC');

    if (filters?.type) {
      query.andWhere('tx.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      query.andWhere('tx.status = :status', { status: filters.status });
    }
    if (filters?.startDate && filters?.endDate) {
      query.andWhere('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }
    if (filters?.limit) {
      query.take(filters.limit);
    }
    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const entities = await query.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findByReference(reference: string, referenceType?: string): Promise<WalletTransaction[]> {
    const query = this.repository.createQueryBuilder('tx')
      .where('tx.reference = :reference', { reference });

    if (referenceType) {
      query.andWhere('tx.referenceType = :referenceType', { referenceType });
    }

    const entities = await query.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async update(transaction: WalletTransaction): Promise<WalletTransaction> {
    const entity = this.toEntity(transaction);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async getWalletStatistics(walletId: string, startDate?: Date, endDate?: Date): Promise<{
    totalCredits: number;
    totalDebits: number;
    totalRefunds: number;
    totalAdjustments: number;
    transactionCount: number;
  }> {
    const query = this.repository.createQueryBuilder('tx')
      .select("SUM(CASE WHEN type IN ('credit', 'auto_recharge') THEN amount ELSE 0 END)", 'totalCredits')
      .addSelect("SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END)", 'totalDebits')
      .addSelect("SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END)", 'totalRefunds')
      .addSelect("SUM(CASE WHEN type = 'adjustment' THEN ABS(amount) ELSE 0 END)", 'totalAdjustments')
      .addSelect('COUNT(*)', 'transactionCount')
      .where('tx.walletId = :walletId', { walletId })
      .andWhere("tx.status = 'completed'");

    if (startDate && endDate) {
      query.andWhere('tx.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const result = await query.getRawOne();

    return {
      totalCredits: parseFloat(result.totalCredits) || 0,
      totalDebits: parseFloat(result.totalDebits) || 0,
      totalRefunds: parseFloat(result.totalRefunds) || 0,
      totalAdjustments: parseFloat(result.totalAdjustments) || 0,
      transactionCount: parseInt(result.transactionCount) || 0,
    };
  }

  async getOrganizationStatistics(organizationId: string, startDate?: Date, endDate?: Date): Promise<{
    totalCredits: number;
    totalDebits: number;
    totalRefunds: number;
    totalAdjustments: number;
    transactionCount: number;
  }> {
    const query = this.repository.createQueryBuilder('tx')
      .select("SUM(CASE WHEN type IN ('credit', 'auto_recharge') THEN amount ELSE 0 END)", 'totalCredits')
      .addSelect("SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END)", 'totalDebits')
      .addSelect("SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END)", 'totalRefunds')
      .addSelect("SUM(CASE WHEN type = 'adjustment' THEN ABS(amount) ELSE 0 END)", 'totalAdjustments')
      .addSelect('COUNT(*)', 'transactionCount')
      .where('tx.organizationId = :organizationId', { organizationId })
      .andWhere("tx.status = 'completed'");

    if (startDate && endDate) {
      query.andWhere('tx.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const result = await query.getRawOne();

    return {
      totalCredits: parseFloat(result.totalCredits) || 0,
      totalDebits: parseFloat(result.totalDebits) || 0,
      totalRefunds: parseFloat(result.totalRefunds) || 0,
      totalAdjustments: parseFloat(result.totalAdjustments) || 0,
      transactionCount: parseInt(result.transactionCount) || 0,
    };
  }

  private toEntity(domain: WalletTransaction): WalletTransactionEntity {
    const entity = new WalletTransactionEntity();
    entity.id = domain.id;
    entity.walletId = domain.walletId;
    entity.organizationId = domain.organizationId;
    entity.type = domain.type;
    entity.amount = domain.amount;
    entity.balanceBefore = domain.balanceBefore;
    entity.balanceAfter = domain.balanceAfter;
    entity.status = domain.status;
    entity.currency = domain.currency;
    entity.reference = domain.reference ?? null;
    entity.referenceType = domain.referenceType ?? null;
    entity.reason = domain.reason ?? null;
    entity.initiatedBy = domain.initiatedBy ?? null;
    entity.metadata = domain.metadata ?? null;
    if (domain.createdAt) entity.createdAt = domain.createdAt;
    if (domain.updatedAt) entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: WalletTransactionEntity): WalletTransaction {
    return new WalletTransaction(
      entity.id,
      entity.walletId,
      entity.organizationId,
      entity.type as TransactionType,
      parseFloat(entity.amount.toString()),
      parseFloat(entity.balanceBefore.toString()),
      parseFloat(entity.balanceAfter.toString()),
      entity.status as TransactionStatus,
      entity.currency,
      entity.reference || undefined,
      entity.referenceType || undefined,
      entity.reason || undefined,
      entity.initiatedBy || undefined,
      entity.metadata || undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
