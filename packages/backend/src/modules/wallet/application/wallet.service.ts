/**
 * Wallet Application Service
 * 
 * Orchestrates wallet operations and transactions
 * Business logic layer between controllers and domain
 */

import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { WALLET_REPOSITORY_PORT, WalletRepository, WALLET_TRANSACTION_REPOSITORY_PORT, WalletTransactionRepository } from '../domain/ports';
import { Wallet, WalletType, WalletStatus, Currency } from '../domain/wallet.domain';
import { WalletTransaction, TransactionType, TransactionStatus } from '../domain/wallet-transaction.domain';
import { CreateWalletDto, CreditWalletDto, DebitWalletDto, AdjustWalletDto, UpdateWalletDto } from '../dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @Inject(WALLET_REPOSITORY_PORT)
    private readonly walletRepository: WalletRepository,
    @Inject(WALLET_TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: WalletTransactionRepository,
  ) {}

  async create(dto: CreateWalletDto): Promise<Wallet> {
    this.logger.log(`Creating wallet for customer ${dto.customerId} in org ${dto.organizationId}`);

    // Check if wallet already exists
    const existing = await this.walletRepository.findByCustomer(dto.organizationId!, dto.customerId);
    if (existing) {
      throw new BadRequestException(`Wallet already exists for customer ${dto.customerId}`);
    }

    const wallet = new Wallet(
      crypto.randomUUID(),
      dto.organizationId!,
      dto.customerId,
      dto.type as WalletType,
      dto.currency as Currency,
      dto.initialBalance || 0,
      dto.creditLimit || 0,
      dto.lowBalanceThreshold || 10,
      WalletStatus.ACTIVE,
      dto.autoRecharge || false,
      dto.autoRechargeAmount,
      dto.autoRechargeTrigger,
      dto.metadata,
    );

    const created = await this.walletRepository.create(wallet);

    // Create initial transaction if initial balance > 0
    if (dto.initialBalance && dto.initialBalance > 0) {
      await this.createTransaction(
        created.id,
        created.organizationId,
        TransactionType.CREDIT,
        dto.initialBalance,
        0,
        dto.initialBalance,
        created.currency,
        'initial-balance',
        'wallet_creation',
        'Initial wallet balance',
        'system',
        { walletCreation: true }
      );
    }

    this.logger.log(`Wallet created: ${created.id}`);
    return created;
  }

  async findById(id: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findById(id);
    if (!wallet) {
      throw new NotFoundException(`Wallet ${id} not found`);
    }
    return wallet;
  }

  async findByCustomer(organizationId: string, customerId: string): Promise<Wallet | null> {
    return this.walletRepository.findByCustomer(organizationId, customerId);
  }

  async findByOrganization(organizationId: string, filters?: any): Promise<Wallet[]> {
    return this.walletRepository.findByOrganization(organizationId, filters);
  }

  async credit(walletId: string, dto: CreditWalletDto, initiatedBy?: string): Promise<WalletTransaction> {
    const wallet = await this.findById(walletId);

    this.logger.log(`Crediting wallet ${walletId} with ${dto.amount}`);

    const balanceBefore = wallet.balance;
    wallet.credit(dto.amount, dto.reason);
    const balanceAfter = wallet.balance;

    await this.walletRepository.update(wallet);

    return this.createTransaction(
      walletId,
      wallet.organizationId,
      TransactionType.CREDIT,
      dto.amount,
      balanceBefore,
      balanceAfter,
      wallet.currency,
      dto.reference,
      dto.referenceType,
      dto.reason,
      initiatedBy,
      dto.metadata
    );
  }

  async debit(walletId: string, dto: DebitWalletDto, initiatedBy?: string): Promise<WalletTransaction> {
    const wallet = await this.findById(walletId);

    this.logger.log(`Debiting wallet ${walletId} with ${dto.amount}`);

    if (!wallet.hasSufficientBalance(dto.amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceBefore = wallet.balance;
    wallet.debit(dto.amount, dto.reason);
    const balanceAfter = wallet.balance;

    await this.walletRepository.update(wallet);

    return this.createTransaction(
      walletId,
      wallet.organizationId,
      TransactionType.DEBIT,
      dto.amount,
      balanceBefore,
      balanceAfter,
      wallet.currency,
      dto.reference,
      dto.referenceType,
      dto.reason,
      initiatedBy,
      dto.metadata
    );
  }

  async refund(walletId: string, amount: number, reason: string, reference?: string, initiatedBy?: string): Promise<WalletTransaction> {
    const wallet = await this.findById(walletId);

    this.logger.log(`Refunding wallet ${walletId} with ${amount}`);

    const balanceBefore = wallet.balance;
    wallet.refund(amount, reason);
    const balanceAfter = wallet.balance;

    await this.walletRepository.update(wallet);

    return this.createTransaction(
      walletId,
      wallet.organizationId,
      TransactionType.REFUND,
      amount,
      balanceBefore,
      balanceAfter,
      wallet.currency,
      reference,
      'refund',
      reason,
      initiatedBy
    );
  }

  async adjust(walletId: string, dto: AdjustWalletDto, initiatedBy?: string): Promise<WalletTransaction> {
    const wallet = await this.findById(walletId);

    this.logger.log(`Adjusting wallet ${walletId} by ${dto.amount}`);

    const balanceBefore = wallet.balance;
    wallet.adjust(dto.amount, dto.reason);
    const balanceAfter = wallet.balance;

    await this.walletRepository.update(wallet);

    return this.createTransaction(
      walletId,
      wallet.organizationId,
      TransactionType.ADJUSTMENT,
      dto.amount,
      balanceBefore,
      balanceAfter,
      wallet.currency,
      dto.reference,
      'adjustment',
      dto.reason,
      initiatedBy,
      dto.metadata
    );
  }

  async update(id: string, dto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.findById(id);

    wallet.updateConfig({
      type: dto.type as WalletType,
      creditLimit: dto.creditLimit,
      lowBalanceThreshold: dto.lowBalanceThreshold,
      autoRecharge: dto.autoRecharge,
      autoRechargeAmount: dto.autoRechargeAmount,
      autoRechargeTrigger: dto.autoRechargeTrigger,
    });

    if (dto.metadata) {
      wallet.updateMetadata(dto.metadata);
    }

    return this.walletRepository.update(wallet);
  }

  async suspend(id: string, reason: string): Promise<Wallet> {
    const wallet = await this.findById(id);
    wallet.suspend(reason);
    return this.walletRepository.update(wallet);
  }

  async activate(id: string): Promise<Wallet> {
    const wallet = await this.findById(id);
    wallet.activate();
    return this.walletRepository.update(wallet);
  }

  async close(id: string, reason: string): Promise<Wallet> {
    const wallet = await this.findById(id);
    wallet.close(reason);
    return this.walletRepository.update(wallet);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists
    await this.walletRepository.delete(id);
  }

  async getWalletStatistics(organizationId: string) {
    return this.walletRepository.getStatistics(organizationId);
  }

  async getTransactionHistory(walletId: string, filters?: any): Promise<WalletTransaction[]> {
    return this.transactionRepository.findByWallet(walletId, filters);
  }

  async getTransactionStatistics(walletId: string, startDate?: Date, endDate?: Date) {
    return this.transactionRepository.getWalletStatistics(walletId, startDate, endDate);
  }

  async getOrganizationTransactions(organizationId: string, filters?: any): Promise<WalletTransaction[]> {
    return this.transactionRepository.findByOrganization(organizationId, filters);
  }

  async reverseTransaction(transactionId: string, initiatedBy?: string): Promise<WalletTransaction> {
    const originalTx = await this.transactionRepository.findById(transactionId);
    if (!originalTx) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (!originalTx.canBeReversed()) {
      throw new BadRequestException('Transaction cannot be reversed');
    }

    const wallet = await this.findById(originalTx.walletId);
    const reversalData = originalTx.createReversal();

    // Perform opposite operation
    let reversalTx: WalletTransaction;
    const balanceBefore = wallet.balance;

    if (reversalData.type === TransactionType.CREDIT) {
      wallet.credit(reversalData.amount!, `Reversal of ${originalTx.type}`);
    } else if (reversalData.type === TransactionType.DEBIT) {
      wallet.debit(reversalData.amount!, `Reversal of ${originalTx.type}`);
    }

    const balanceAfter = wallet.balance;
    await this.walletRepository.update(wallet);

    reversalTx = await this.createTransaction(
      wallet.id,
      wallet.organizationId,
      reversalData.type!,
      reversalData.amount!,
      balanceBefore,
      balanceAfter,
      wallet.currency,
      reversalData.reference,
      reversalData.referenceType,
      reversalData.reason,
      initiatedBy,
      reversalData.metadata
    );

    // Mark original as reversed
    originalTx.markAsReversed(reversalTx.id);
    await this.transactionRepository.update(originalTx);

    this.logger.log(`Transaction ${transactionId} reversed with ${reversalTx.id}`);
    return reversalTx;
  }

  private async createTransaction(
    walletId: string,
    organizationId: string,
    type: TransactionType,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    currency: string,
    reference?: string,
    referenceType?: string,
    reason?: string,
    initiatedBy?: string,
    metadata?: Record<string, any>
  ): Promise<WalletTransaction> {
    const transaction = new WalletTransaction(
      crypto.randomUUID(),
      walletId,
      organizationId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      TransactionStatus.COMPLETED,
      currency,
      reference,
      referenceType,
      reason,
      initiatedBy,
      metadata,
      new Date(),
      new Date()
    );

    return this.transactionRepository.create(transaction);
  }
}
