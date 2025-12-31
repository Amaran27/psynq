import { Injectable, Logger } from '@nestjs/common';
import { StoragePort } from '../ports/storage.port';
import { MinioStorageAdapter } from './storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../services/settings.service';
import { Readable } from 'stream';

/**
 * Storage Factory - Allows switching between storage providers via configuration
 * 
 * Supported providers:
 * - minio: MinIO S3-compatible storage (default, self-hosted)
 * - s3: AWS S3 or S3-compatible services (Wasabi, DigitalOcean Spaces, etc.)
 * - azure: Azure Blob Storage (future)
 * - gcp: Google Cloud Storage (future)
 * 
 * Configuration via environment variable or database setting:
 * - STORAGE_PROVIDER=storage provider name (default: minio)
 * - storage.<provider>.config = provider-specific configuration in database
 */
@Injectable()
export class StorageFactoryAdapter implements StoragePort {
  private readonly logger = new Logger(StorageFactoryAdapter.name);
  private defaultProvider: string;
  private adapters: Map<string, StoragePort> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly minioAdapter: MinioStorageAdapter,
    private readonly s3Adapter: S3StorageAdapter,
  ) {
    this.defaultProvider = this.configService.get<string>('STORAGE_PROVIDER', 'minio');
    
    // Register available adapters
    this.adapters.set('minio', this.minioAdapter);
    this.adapters.set('s3', this.s3Adapter);
    
    this.logger.log(`Storage factory initialized with default provider: ${this.defaultProvider}`);
  }

  /**
   * Get the appropriate storage adapter for the organization
   * Falls back to default provider if organization doesn't have a specific one configured
   */
  private async getAdapter(orgId: string | null): Promise<StoragePort> {
    // Check if organization has a specific storage provider configured
    const providerOverride = await this.settingsService.getSetting(orgId, 'storage.provider', true);
    const provider = providerOverride || this.defaultProvider;
    
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      this.logger.warn(`Unknown storage provider: ${provider}, falling back to ${this.defaultProvider}`);
      return this.adapters.get(this.defaultProvider)!;
    }
    
    return adapter;
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

  /**
   * Get current storage provider for an organization
   */
  async getCurrentProvider(orgId: string | null): Promise<string> {
    const providerOverride = await this.settingsService.getSetting(orgId, 'storage.provider', true);
    return providerOverride || this.defaultProvider;
  }

  /**
   * List available storage providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
