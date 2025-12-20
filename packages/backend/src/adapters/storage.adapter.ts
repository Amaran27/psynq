import { Injectable, Logger } from '@nestjs/common';
import { StoragePort } from '../ports/storage.port';
import { Client } from 'minio';
import { Readable } from 'stream';
import { SettingsService } from '../services/settings.service';

@Injectable()
export class MinioStorageAdapter implements StoragePort {
  private readonly logger = new Logger(MinioStorageAdapter.name);

  constructor(private readonly settingsService: SettingsService) {}

  private async getClient(orgId: string | null): Promise<{ client: Client, bucket: string }> {
    const config = await this.settingsService.getSetting(orgId, 'storage.minio.config', true);
    if (!config || !config.accessKey || !config.secretKey) {
      throw new Error(`MinIO configuration missing for organization ${orgId || 'system'}`);
    }

    const endpoint = config.endpoint || 'localhost';
    const client = new Client({
      endPoint: endpoint.replace('http://', '').replace('https://', ''),
      port: config.port ? parseInt(config.port) : 9000,
      useSSL: endpoint.startsWith('https') || config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });

    return { client, bucket: config.bucket || 'psynq-recordings' };
  }

  async upload(orgId: string | null, key: string, stream: Readable, contentType: string, metadata?: Record<string, string>): Promise<void> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      await client.putObject(bucket, key, stream, undefined, { 'Content-Type': contentType, ...metadata });
      this.logger.log(`Uploaded file to minio://${bucket}/${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload ${key}:`, error);
      throw error;
    }
  }

  async getSignedUrl(orgId: string | null, key: string, expiresInSeconds: number, operation: 'GET' | 'PUT'): Promise<string> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      return operation === 'GET'
        ? await client.presignedGetObject(bucket, key, expiresInSeconds)
        : await client.presignedPutObject(bucket, key, expiresInSeconds);
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}:`, error);
      throw error;
    }
  }

  async delete(orgId: string | null, key: string): Promise<void> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      await client.removeObject(bucket, key);
    } catch (error) {
      this.logger.error(`Failed to delete ${key}:`, error);
      throw error;
    }
  }

  async list(orgId: string | null, prefix: string): Promise<string[]> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      const stream = client.listObjectsV2(bucket, prefix);
      const objects: any[] = [];
      for await (const obj of stream) { objects.push(obj); }
      return objects.map(obj => obj.name || '').filter(name => name);
    } catch (error) {
      this.logger.error(`Failed to list objects with prefix ${prefix}:`, error);
      throw error;
    }
  }

  async healthCheck(orgId: string | null): Promise<boolean> {
    try {
      const { client } = await this.getClient(orgId);
      await client.listBuckets();
      return true;
    } catch (error) {
      return false;
    }
  }

  async applyLifecyclePolicy(orgId: string | null, prefix: string, olderThanDays: number): Promise<void> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      const stream = client.listObjectsV2(bucket, prefix);
      const objects: any[] = [];
      for await (const obj of stream) { objects.push(obj); }
      const toDelete = objects.filter(obj => obj.lastModified && obj.lastModified < cutoff);
      if (toDelete.length > 0) {
        await client.removeObjects(bucket, toDelete.map(obj => obj.name || ''));
      }
    } catch (error) {
      this.logger.error(`Failed to apply lifecycle policy for ${prefix}:`, error);
      throw error;
    }
  }
}