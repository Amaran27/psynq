import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { MinioStorageAdapter } from '../../adapters/storage.adapter';
import { StoragePort } from '../../ports/storage.port';

@Module({
  providers: [
    StorageService,
    {
      provide: 'StoragePort',
      useClass: MinioStorageAdapter,
    },
  ],
  controllers: [StorageController],
  exports: [StorageService, 'StoragePort'],
})
export class StorageModule {}