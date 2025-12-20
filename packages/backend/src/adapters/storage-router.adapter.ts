import { Injectable, Optional, Logger, Inject } from '@nestjs/common';
import { StoragePort } from '../ports/storage.port';
import { SettingsService } from '../services/settings.service';
import { MinioStorageAdapter } from './storage.adapter';
import { LocalStorageAdapter } from './local-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { Readable } from 'stream';

@Injectable()
export class StorageRouterAdapter implements StoragePort {
  private readonly logger = new Logger(StorageRouterAdapter.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly minioAdapter: MinioStorageAdapter,
    private readonly localAdapter: LocalStorageAdapter,
    private readonly s3Adapter: S3StorageAdapter,
  ) {}

  private async getAdapter(orgId: string | null): Promise<StoragePort> {
    const provider = await this.settingsService.getSetting(orgId, 'storage.provider') || 'local';
    
    switch (provider.toLowerCase()) {
      case 's3':
        return this.s3Adapter;
      case 'minio':
        return this.minioAdapter;
      case 'local':
      default:
        return this.localAdapter;
    }
  }

  async upload(orgId: string | null, key: string, stream: Readable, contentType: string, metadata?: Record<string, string>): Promise<void> {
    const adapter = await this.getAdapter(orgId);
    return adapter.upload(orgId, key, stream, contentType, metadata);
  }

  async getSignedUrl(orgId: string | null, key: string, expiresInSeconds: number, operation: 'GET' | 'PUT'): Promise<string> {
    const adapter = await this.getAdapter(orgId);
    return adapter.getSignedUrl(orgId, key, expiresInSeconds, operation);
  }

  async delete(orgId: string | null, key: string): Promise<void> {
    const adapter = await this.getAdapter(orgId);
    return adapter.delete(orgId, key);
  }

  async list(orgId: string | null, prefix: string): Promise<string[]> {
    const adapter = await this.getAdapter(orgId);
    return adapter.list(orgId, prefix);
  }

  async healthCheck(orgId: string | null): Promise<boolean> {
    const adapter = await this.getAdapter(orgId);
    return adapter.healthCheck(orgId);
  }

  async applyLifecyclePolicy(orgId: string | null, prefix: string, olderThanDays: number): Promise<void> {
    const adapter = await this.getAdapter(orgId);
    return adapter.applyLifecyclePolicy(orgId, prefix, olderThanDays);
  }
}
