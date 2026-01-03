import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelEntity } from '../../entities/channel.entity';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelEntity]),
    AsteriskModule,
    EventBusModule,
  ],
  providers: [ChannelService],
  controllers: [ChannelController],
  exports: [ChannelService],
})
export class ChannelModule {}
