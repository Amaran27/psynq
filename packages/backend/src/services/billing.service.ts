import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletEntity } from '../entities/wallet.entity';
import { RateEntity } from '../entities/rate.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(RateEntity)
    private readonly rateRepository: Repository<RateEntity>,
  ) {}

  async getBalance(orgId: string): Promise<number> {
    const wallet = await this.walletRepository.findOne({ where: { organizationId: orgId } });
    return wallet ? Number(wallet.balance) : 0;
  }

  async checkBalance(orgId: string, to: string): Promise<void> {
    const balance = await this.getBalance(orgId);
    if (balance <= 0) {
      throw new BadRequestException('Insufficient balance to initiate a call.');
    }
  }

  async getRate(to: string): Promise<number> {
    // Basic LCR (Least Cost Routing) style prefix match
    const rates = await this.rateRepository.find();
    const sortedRates = rates.sort((a, b) => b.prefix.length - a.prefix.length); // Longest match first
    
    const match = sortedRates.find(r => to.startsWith(r.prefix));
    return match ? Number(match.costPerSecond) : 0.001; // Default fallback rate
  }

  async chargeForCall(orgId: string, durationSeconds: number, rate: number): Promise<void> {
    const cost = durationSeconds * rate;
    const wallet = await this.walletRepository.findOne({ where: { organizationId: orgId } });
    
    if (wallet) {
      wallet.balance = Number(wallet.balance) - cost;
      await this.walletRepository.save(wallet);
      this.logger.log(`Charged org ${orgId} amount ${cost} for ${durationSeconds}s call.`);
    }
  }
}
