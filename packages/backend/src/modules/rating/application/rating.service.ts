import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  RATE_PLAN_REPOSITORY_PORT,
  RatePlanRepository,
} from '../domain/ports/rate-plan-repository.port';
import {
  CUSTOMER_WALLET_REPOSITORY_PORT,
  CustomerWalletRepository,
} from '../domain/ports/customer-wallet-repository.port';
import {
  USAGE_RECORD_REPOSITORY_PORT,
  UsageRecordRepository,
} from '../domain/ports/usage-record-repository.port';
import {
  RATING_BATCH_REPOSITORY_PORT,
  RatingBatchRepository,
} from '../domain/ports/rating-batch-repository.port';
import { RatePlan, RatePlanStatus } from '../domain/rate-plan.domain';
import { CustomerWallet, TransactionType, WalletStatus } from '../domain/customer-wallet.domain';
import { UsageRecord, RatingStatus } from '../domain/usage-record.domain';
import { RatingBatch, BatchStatus } from '../domain/rating-batch.domain';
import { CreateRatePlanDto } from './dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from './dto/update-rate-plan.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletTransactionDto } from './dto/wallet-transaction.dto';
import { CreateUsageRecordDto } from './dto/create-usage-record.dto';
import { ProcessRatingDto } from './dto/process-rating.dto';

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @Inject(RATE_PLAN_REPOSITORY_PORT)
    private readonly ratePlanRepository: RatePlanRepository,
    @Inject(CUSTOMER_WALLET_REPOSITORY_PORT)
    private readonly walletRepository: CustomerWalletRepository,
    @Inject(USAGE_RECORD_REPOSITORY_PORT)
    private readonly usageRecordRepository: UsageRecordRepository,
    @Inject(RATING_BATCH_REPOSITORY_PORT)
    private readonly ratingBatchRepository: RatingBatchRepository,
  ) {}

  // ================== Rate Plan Methods ==================

  async createRatePlan(dto: CreateRatePlanDto): Promise<RatePlan> {
    const ratePlan = new RatePlan(
      uuidv4(),
      dto.organizationId,
      dto.name,
      dto.type,
      RatePlanStatus.DRAFT,
      dto.description,
      dto.chargeType,
      dto.baseRate,
      dto.minimumCharge,
      dto.roundingMethod,
      dto.roundingIncrement,
      dto.freeSeconds,
      dto.currency,
      dto.billingCycle,
      dto.gracePeriodDays,
      dto.lowBalanceThreshold,
      dto.autoRecharge,
      dto.autoRechargeAmount,
      dto.autoRechargeThreshold,
      dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      dto.metadata,
    );

    ratePlan.validate();
    return this.ratePlanRepository.create(ratePlan);
  }

  async getRatePlan(id: string): Promise<RatePlan> {
    const ratePlan = await this.ratePlanRepository.findById(id);
    if (!ratePlan) {
      throw new NotFoundException(`Rate plan with ID ${id} not found`);
    }
    return ratePlan;
  }

  async getAllRatePlans(organizationId?: string): Promise<RatePlan[]> {
    return organizationId
      ? this.ratePlanRepository.findByOrganization(organizationId)
      : this.ratePlanRepository.findAll();
  }

  async getActiveRatePlans(organizationId: string): Promise<RatePlan[]> {
    return this.ratePlanRepository.findActive(organizationId);
  }

  async updateRatePlan(id: string, dto: UpdateRatePlanDto): Promise<RatePlan> {
    const ratePlan = await this.getRatePlan(id);

    ratePlan.updateSettings(
      dto.name,
      dto.description,
      dto.baseRate,
      dto.minimumCharge,
      dto.freeSeconds,
    );

    ratePlan.validate();
    return this.ratePlanRepository.update(ratePlan);
  }

  async activateRatePlan(id: string): Promise<RatePlan> {
    const ratePlan = await this.getRatePlan(id);
    ratePlan.activate();
    return this.ratePlanRepository.update(ratePlan);
  }

  async suspendRatePlan(id: string): Promise<RatePlan> {
    const ratePlan = await this.getRatePlan(id);
    ratePlan.suspend();
    return this.ratePlanRepository.update(ratePlan);
  }

  async deleteRatePlan(id: string): Promise<void> {
    await this.getRatePlan(id);
    await this.ratePlanRepository.delete(id);
  }

  // ================== Customer Wallet Methods ==================

  async createWallet(dto: CreateWalletDto): Promise<CustomerWallet> {
    // Check if wallet already exists
    const existing = await this.walletRepository.findByCustomer(
      dto.organizationId,
      dto.customerId,
    );
    if (existing) {
      throw new BadRequestException('Wallet already exists for this customer');
    }

    const wallet = new CustomerWallet(
      uuidv4(),
      dto.organizationId,
      dto.customerId,
      dto.balance,
      dto.currency,
      WalletStatus.ACTIVE,
      dto.lowBalanceThreshold,
      dto.autoRecharge,
      dto.autoRechargeAmount,
      dto.autoRechargeThreshold,
      undefined,
      undefined,
      dto.balance || 0,
      0,
      0,
      dto.balance || 0,
      dto.metadata,
    );

    wallet.validate();
    return this.walletRepository.create(wallet);
  }

  async getWallet(id: string): Promise<CustomerWallet> {
    const wallet = await this.walletRepository.findById(id);
    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }
    return wallet;
  }

  async getWalletByCustomer(organizationId: string, customerId: string): Promise<CustomerWallet> {
    const wallet = await this.walletRepository.findByCustomer(organizationId, customerId);
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for customer ${customerId}`);
    }
    return wallet;
  }

  async getAllWallets(organizationId?: string): Promise<CustomerWallet[]> {
    return organizationId
      ? this.walletRepository.findAll({ organizationId })
      : this.walletRepository.findAll();
  }

  async updateWallet(id: string, dto: UpdateWalletDto): Promise<CustomerWallet> {
    const wallet = await this.getWallet(id);

    wallet.updateSettings(
      dto.lowBalanceThreshold,
      dto.autoRecharge,
      dto.autoRechargeAmount,
      dto.autoRechargeThreshold,
    );

    wallet.validate();
    return this.walletRepository.update(wallet);
  }

  async processWalletTransaction(id: string, dto: WalletTransactionDto): Promise<CustomerWallet> {
    const wallet = await this.getWallet(id);

    switch (dto.type) {
      case TransactionType.CREDIT:
        wallet.credit(dto.amount, dto.description);
        break;
      case TransactionType.DEBIT:
        wallet.debit(dto.amount, dto.description);
        break;
      case TransactionType.REFUND:
        wallet.refund(dto.amount, dto.description);
        break;
      case TransactionType.ADJUSTMENT:
        wallet.adjust(dto.amount, dto.description);
        break;
      default:
        throw new BadRequestException(`Invalid transaction type: ${dto.type}`);
    }

    return this.walletRepository.update(wallet);
  }

  async suspendWallet(id: string): Promise<CustomerWallet> {
    const wallet = await this.getWallet(id);
    wallet.suspend();
    return this.walletRepository.update(wallet);
  }

  async activateWallet(id: string): Promise<CustomerWallet> {
    const wallet = await this.getWallet(id);
    wallet.activate();
    return this.walletRepository.update(wallet);
  }

  async deleteWallet(id: string): Promise<void> {
    const wallet = await this.getWallet(id);
    wallet.close();
    await this.walletRepository.delete(id);
  }

  async getWalletStatistics(id: string): Promise<any> {
    const wallet = await this.getWallet(id);
    return wallet.getStatistics();
  }

  // ================== Usage Record Methods ==================

  async createUsageRecord(dto: CreateUsageRecordDto): Promise<UsageRecord> {
    const usageRecord = new UsageRecord(
      uuidv4(),
      dto.organizationId,
      dto.customerId,
      dto.ratePlanId,
      dto.walletId,
      dto.usageType,
      dto.startTime ? new Date(dto.startTime) : new Date(),
      dto.endTime ? new Date(dto.endTime) : undefined,
      dto.durationSeconds,
      dto.quantity,
      0,
      0,
      'USD',
      RatingStatus.PENDING,
      undefined,
      dto.sourceNumber,
      dto.destinationNumber,
      dto.callId,
      dto.campaignId,
      undefined,
      undefined,
      dto.metadata,
    );

    // Calculate duration if both start and end times are provided
    if (usageRecord.endTime) {
      usageRecord.calculateDuration();
    }

    usageRecord.validate();
    return this.usageRecordRepository.create(usageRecord);
  }

  async getUsageRecord(id: string): Promise<UsageRecord> {
    const record = await this.usageRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Usage record with ID ${id} not found`);
    }
    return record;
  }

  async getUsageRecordsByCustomer(
    organizationId: string,
    customerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UsageRecord[]> {
    return this.usageRecordRepository.findByCustomer(organizationId, customerId, startDate, endDate);
  }

  async getPendingUsageRecords(organizationId: string, limit?: number): Promise<UsageRecord[]> {
    return this.usageRecordRepository.findPendingRating(organizationId, limit);
  }

  // ================== Rating Batch Methods ==================

  async processBatchRating(dto: ProcessRatingDto): Promise<RatingBatch> {
    const limit = dto.limit || 100;

    // Get pending usage records
    const pendingRecords = await this.usageRecordRepository.findPendingRating(
      dto.organizationId,
      limit,
    );

    if (pendingRecords.length === 0) {
      throw new BadRequestException('No pending usage records to rate');
    }

    // Create rating batch
    const batch = new RatingBatch(
      uuidv4(),
      dto.organizationId,
      BatchStatus.PENDING,
    );
    let savedBatch = await this.ratingBatchRepository.create(batch);

    try {
      // Start batch processing
      savedBatch.start(pendingRecords.length);
      savedBatch = await this.ratingBatchRepository.update(savedBatch);

      // Process each usage record
      for (const record of pendingRecords) {
        try {
          await this.rateUsageRecord(record, savedBatch.id);
          savedBatch.recordSuccess(record.totalCost);
        } catch (error) {
          this.logger.error(`Failed to rate usage record ${record.id}: ${error.message}`);
          savedBatch.recordFailure(error.message);
        }
      }

      // Complete batch
      savedBatch.complete();
      return this.ratingBatchRepository.update(savedBatch);
    } catch (error) {
      this.logger.error(`Batch rating failed: ${error.message}`);
      savedBatch.fail(error.message);
      return this.ratingBatchRepository.update(savedBatch);
    }
  }

  private async rateUsageRecord(record: UsageRecord, batchId: string): Promise<void> {
    // Get rate plan
    const ratePlan = await this.getRatePlan(record.ratePlanId);

    if (!ratePlan.isActive()) {
      throw new BadRequestException('Rate plan is not active');
    }

    // Calculate charge
    const totalCost = ratePlan.calculateCharge(record.durationSeconds);
    const unitCost = record.durationSeconds > 0 ? totalCost / record.durationSeconds : 0;

    // Mark as rated
    record.markAsRated(unitCost, totalCost, batchId);

    // Debit from wallet if wallet ID is provided
    if (record.walletId) {
      try {
        const wallet = await this.getWallet(record.walletId);
        if (wallet.hasSufficientBalance(totalCost)) {
          wallet.debit(totalCost, `Usage charge for ${record.id}`);
          await this.walletRepository.update(wallet);
        } else {
          record.markAsFailed('Insufficient wallet balance');
        }
      } catch (error) {
        this.logger.error(`Failed to debit wallet: ${error.message}`);
        record.markAsFailed(`Wallet debit failed: ${error.message}`);
      }
    }

    // Update usage record
    await this.usageRecordRepository.update(record);
  }

  async getRatingBatch(id: string): Promise<RatingBatch> {
    const batch = await this.ratingBatchRepository.findById(id);
    if (!batch) {
      throw new NotFoundException(`Rating batch with ID ${id} not found`);
    }
    return batch;
  }

  async getRatingBatches(organizationId: string): Promise<RatingBatch[]> {
    return this.ratingBatchRepository.findByOrganization(organizationId);
  }

  async getBatchStatistics(id: string): Promise<any> {
    const batch = await this.getRatingBatch(id);
    return batch.getStatistics();
  }

  // ================== Statistics & Reports ==================

  async getOrganizationStatistics(organizationId: string): Promise<any> {
    const [ratePlansCount, walletsCount, pendingUsageCount, totalRevenue] = await Promise.all([
      this.ratePlanRepository.count({ organizationId }),
      this.walletRepository.count({ organizationId }),
      this.usageRecordRepository.count({ organizationId, ratingStatus: RatingStatus.PENDING }),
      this.usageRecordRepository.sumTotalCost({ organizationId, ratingStatus: RatingStatus.RATED }),
    ]);

    const lowBalanceWallets = await this.walletRepository.findLowBalance(organizationId);
    const autoRechargeEligible = await this.walletRepository.findAutoRechargeEligible(organizationId);

    return {
      ratePlansCount,
      walletsCount,
      pendingUsageCount,
      totalRevenue,
      lowBalanceWalletsCount: lowBalanceWallets.length,
      autoRechargeEligibleCount: autoRechargeEligible.length,
    };
  }
}
