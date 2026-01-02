import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { MinioStorageAdapter } from '../../adapters/storage.adapter';
import { LocalStorageAdapter } from '../../adapters/local-storage.adapter';
import { S3StorageAdapter } from '../../adapters/s3-storage.adapter';
import { StorageRouterAdapter } from '../../adapters/storage-router.adapter';
import { StoragePort } from '../../ports/storage.port';
import { SettingsModule } from '../settings.module';

@Module({
  imports: [SettingsModule],
  providers: [
    StorageService,
    MinioStorageAdapter,
    LocalStorageAdapter,
    S3StorageAdapter,
    StorageRouterAdapter,
    {
      provide: 'STORAGE_PROVIDER',
      useClass: StorageRouterAdapter,
    },
    {
      provide: 'StoragePort',
      useExisting: 'STORAGE_PROVIDER',
    },
  ],
  controllers: [StorageController],
  exports: [StorageService, 'STORAGE_PROVIDER', 'StoragePort'],
})
export class StorageModule {}
