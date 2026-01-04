/**
 * Wallet Module
 * 
 * Wires wallet domain, services, controllers, and persistence
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletEntity } from './infrastructure/persistence/typeorm/entities/wallet.entity';
import { WalletTransactionEntity } from './infrastructure/persistence/typeorm/entities/wallet-transaction.entity';
import { WalletRepositoryAdapter } from './infrastructure/persistence/typeorm/adapters/wallet-repository.adapter';
import { WalletTransactionRepositoryAdapter } from './infrastructure/persistence/typeorm/adapters/wallet-transaction-repository.adapter';
import { WALLET_REPOSITORY_PORT, WALLET_TRANSACTION_REPOSITORY_PORT } from './domain/ports';
import { WalletService } from './application/wallet.service';
import { WalletController } from './presentation/wallet.controller';
import { WalletTransactionController } from './presentation/wallet-transaction.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletEntity, WalletTransactionEntity]),
  ],
  controllers: [WalletController, WalletTransactionController],
  providers: [
    {
      provide: WALLET_REPOSITORY_PORT,
      useClass: WalletRepositoryAdapter,
    },
    {
      provide: WALLET_TRANSACTION_REPOSITORY_PORT,
      useClass: WalletTransactionRepositoryAdapter,
    },
    WalletService,
  ],
  exports: [WalletService],
})
export class WalletModule {}
