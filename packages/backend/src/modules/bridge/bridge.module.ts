import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { BridgeController } from './bridge.controller';
import { BridgeService } from './bridge.service';
import { BridgeEntity } from '../../entities/bridge.entity';
import { AsteriskAdapter } from '../../adapters/asterisk.adapter';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { StorageModule } from '../storage/storage.module';
import { SettingsModule } from '../settings.module';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BridgeEntity]),
    AsteriskModule,
    EventBusModule,
    StorageModule,
    SettingsModule,
    ConfigModule,
    NestConfigModule,
  ],
  controllers: [BridgeController],
  providers: [
    BridgeService,
    {
      provide: 'TELEPHONY_PROVIDER',
      useClass: AsteriskAdapter,
    },
  ],
  exports: [BridgeService],
})
export class BridgeModule {}
