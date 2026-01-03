import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign.controller';
import { CampaignEntity } from '../../entities/campaign.entity';
import { EventBusModule } from '../event-bus/event-bus.module';
import { CAMPAIGN_REPOSITORY_PORT } from './ports/campaign-repository.port';
import { TypeOrmCampaignRepositoryAdapter } from './adapters/typeorm-campaign-repository.adapter';
import { CreateCampaignUseCase } from './application/create-campaign.usecase';
import { GetCampaignUseCase } from './application/get-campaign.usecase';
import { ListCampaignsUseCase } from './application/list-campaigns.usecase';
import { UpdateCampaignUseCase } from './application/update-campaign.usecase';
import { DeleteCampaignUseCase } from './application/delete-campaign.usecase';
import { StartCampaignUseCase } from './application/start-campaign.usecase';

/**
 * Campaign Module (Hexagonal Architecture)
 * 
 * Wires together:
 * - Domain (pure TypeScript entities with business logic)
 * - Ports (interfaces)
 * - Adapters (TypeORM implementations)
 * - Application (use cases)
 * - Controller (HTTP layer)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignEntity]),
    EventBusModule,
  ],
  controllers: [CampaignController],
  providers: [
    // Bind port to adapter
    {
      provide: CAMPAIGN_REPOSITORY_PORT,
      useClass: TypeOrmCampaignRepositoryAdapter,
    },
    // Register use cases
    CreateCampaignUseCase,
    GetCampaignUseCase,
    ListCampaignsUseCase,
    UpdateCampaignUseCase,
    DeleteCampaignUseCase,
    StartCampaignUseCase,
  ],
  exports: [
    // Export use cases for other modules
    CreateCampaignUseCase,
    GetCampaignUseCase,
    ListCampaignsUseCase,
  ],
})
export class CampaignModule {}
