import { Module } from '@nestjs/common';
import { AsteriskAdapter } from '../../adapters/asterisk.adapter';
import { StorageModule } from '../storage/storage.module';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [StorageModule, ConfigModule],
  providers: [AsteriskAdapter],
  exports: [AsteriskAdapter],
})
export class AsteriskModule {}