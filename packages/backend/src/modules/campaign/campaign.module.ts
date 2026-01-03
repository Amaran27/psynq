import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { CampaignEntity } from '../../entities/campaign.entity';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignEntity]),
    EventBusModule,
  ],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
