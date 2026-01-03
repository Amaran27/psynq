import { Module } from '@nestjs/common';
import { AsteriskAdapter } from '../../adapters/asterisk.adapter';
import { StorageModule } from '../storage/storage.module';
import { ConfigModule } from '../../config/config.module';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [StorageModule, ConfigModule, EventBusModule],
  providers: [
    AsteriskAdapter,
    {
      provide: 'TELEPHONY_PROVIDER',
      useExisting: AsteriskAdapter,
    },
  ],
  exports: ['TELEPHONY_PROVIDER'],
})
export class AsteriskModule {}
