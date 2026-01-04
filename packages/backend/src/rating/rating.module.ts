import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { RatePlanEntity } from '../modules/rating/infrastructure/persistence/rate-plan.entity';
import { CustomerWalletEntity } from '../modules/rating/infrastructure/persistence/customer-wallet.entity';
import { UsageRecordEntity } from '../modules/rating/infrastructure/persistence/usage-record.entity';
import { RatingBatchEntity } from '../modules/rating/infrastructure/persistence/rating-batch.entity';

// Port tokens
import {
  RATE_PLAN_REPOSITORY_PORT,
  CUSTOMER_WALLET_REPOSITORY_PORT,
  USAGE_RECORD_REPOSITORY_PORT,
  RATING_BATCH_REPOSITORY_PORT,
} from '../modules/rating/domain/ports';

// Adapters
import { TypeOrmRatePlanRepositoryAdapter } from '../modules/rating/infrastructure/adapters/typeorm-rate-plan-repository.adapter';
import { TypeOrmCustomerWalletRepositoryAdapter } from '../modules/rating/infrastructure/adapters/typeorm-customer-wallet-repository.adapter';
import { TypeOrmUsageRecordRepositoryAdapter } from '../modules/rating/infrastructure/adapters/typeorm-usage-record-repository.adapter';
import { TypeOrmRatingBatchRepositoryAdapter } from '../modules/rating/infrastructure/adapters/typeorm-rating-batch-repository.adapter';

// Services
import { RatingService } from '../modules/rating/application/rating.service';

// Controllers
import { RatePlansController } from '../modules/rating/presentation/rate-plans.controller';
import { WalletsController } from '../modules/rating/presentation/wallets.controller';
import { RatingController } from '../modules/rating/presentation/rating.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RatePlanEntity,
      CustomerWalletEntity,
      UsageRecordEntity,
      RatingBatchEntity,
    ]),
  ],
  providers: [
    RatingService,
    {
      provide: RATE_PLAN_REPOSITORY_PORT,
      useClass: TypeOrmRatePlanRepositoryAdapter,
    },
    {
      provide: CUSTOMER_WALLET_REPOSITORY_PORT,
      useClass: TypeOrmCustomerWalletRepositoryAdapter,
    },
    {
      provide: USAGE_RECORD_REPOSITORY_PORT,
      useClass: TypeOrmUsageRecordRepositoryAdapter,
    },
    {
      provide: RATING_BATCH_REPOSITORY_PORT,
      useClass: TypeOrmRatingBatchRepositoryAdapter,
    },
  ],
  controllers: [RatePlansController, WalletsController, RatingController],
  exports: [RatingService],
})
export class RatingModule {}
