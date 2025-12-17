import { Module } from '@nestjs/common';
import { AsteriskAdapter } from '../../adapters/asterisk.adapter';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [AsteriskAdapter],
  exports: [AsteriskAdapter],
})
export class AsteriskModule {}