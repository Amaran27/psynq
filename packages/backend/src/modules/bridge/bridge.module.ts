import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BridgeController } from './bridge.controller';
import { BridgeService } from './bridge.service';
import { BridgeEntity } from '../../entities/bridge.entity';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { StorageModule } from '../storage/storage.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BridgeEntity]),
    AsteriskModule,
    EventBusModule,
    StorageModule,
    SettingsModule,
    ConfigModule,
  ],
  controllers: [BridgeController],
  providers: [
    BridgeService,
    {
      provide: 'TELEPHONY_PROVIDER',
      useFactory: (asteriskAdapter) => asteriskAdapter,
      inject: ['AsteriskAdapter'],
    },
  ],
  exports: [BridgeService],
})
export class BridgeModule {}
