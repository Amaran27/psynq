import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelEntity } from '../../entities/channel.entity';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { AsteriskAdapter } from '../../adapters/asterisk.adapter';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { StorageModule } from '../storage/storage.module';
import { SettingsModule } from '../settings.module';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelEntity]),
    AsteriskModule,
    EventBusModule,
    StorageModule,
    SettingsModule,
    ConfigModule,
  ],
  providers: [
    ChannelService,
    {
      provide: 'TELEPHONY_PROVIDER',
      useClass: AsteriskAdapter,
    },
  ],
  controllers: [ChannelController],
  exports: [ChannelService],
})
export class ChannelModule {}
