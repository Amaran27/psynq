import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoragePort } from '../ports/storage.port';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioStorageAdapter implements StoragePort {
  private readonly logger = new (require('@nestjs/common').Logger)(MinioStorageAdapter.name);
  private client: Client | null;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || process.env.MINIO_ENDPOINT || 'localhost:9000';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || process.env.MINIO_ACCESS_KEY;
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || process.env.MINIO_SECRET_KEY;
    this.bucket = this.configService.get<string>('MINIO_BUCKET') || process.env.MINIO_BUCKET || 'psynq-recordings';

    if (!accessKey || !secretKey) {
      this.logger.warn('MinIO credentials not configured — MinioStorageAdapter will operate in "dry" mode.');
      this.client = null;
      return;
    }

    this.client = new Client({
      endPoint: endpoint.replace('http://', '').replace('https://', ''), // MinIO expects without protocol
      port: endpoint.includes(':') ? parseInt(endpoint.split(':')[1]) : 9000,
      useSSL: endpoint.startsWith('https'),
      accessKey,
      secretKey,
    });
  }

  async upload(key: string, stream: Readable, contentType: string, metadata?: Record<string, string>): Promise<void> {
    if (!this.client) {
      this.logger.warn('MinIO client not configured — upload will no-op.');
      return;
    }
    try {
      await this.client.putObject(this.bucket, key, stream, undefined, { 'Content-Type': contentType, ...metadata });
      this.logger.log(`Uploaded file to ${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload ${key}:`, error);
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds: number, operation: 'GET' | 'PUT'): Promise<string> {
    if (!this.client) {
      throw new Error('MinIO client not configured');
    }
    try {
      const url = operation === 'GET'
        ? await this.client.presignedGetObject(this.bucket, key, expiresInSeconds)
        : await this.client.presignedPutObject(this.bucket, key, expiresInSeconds);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('MinIO client not configured — delete will no-op.');
      return;
    }
    try {
      await this.client.removeObject(this.bucket, key);
      this.logger.log(`Deleted file ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${key}:`, error);
      throw error;
    }
  }

  async list(prefix: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    try {
      const stream = this.client.listObjectsV2(this.bucket, prefix);
      const objects: any[] = [];
      for await (const obj of stream) {
        objects.push(obj);
      }
      return objects.map(obj => obj.name || '').filter(name => name);
    } catch (error) {
      this.logger.error(`Failed to list objects with prefix ${prefix}:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    try {
      await this.client.listBuckets();
      return true;
    } catch (error) {
      this.logger.error('MinIO health check failed:', error);
      return false;
    }
  }

  async applyLifecyclePolicy(prefix: string, olderThanDays: number): Promise<void> {
    if (!this.client) {
      this.logger.warn('MinIO client not configured — lifecycle policy will no-op.');
      return;
    }
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      const stream = this.client.listObjectsV2(this.bucket, prefix);
      const objects: any[] = [];
      for await (const obj of stream) {
        objects.push(obj);
      }
      const toDelete = objects.filter(obj => obj.lastModified && obj.lastModified < cutoff);
      if (toDelete.length > 0) {
        await this.client.removeObjects(this.bucket, toDelete.map(obj => obj.name || ''));
        this.logger.log(`Deleted ${toDelete.length} old files under ${prefix}`);
      }
    } catch (error) {
      this.logger.error(`Failed to apply lifecycle policy for ${prefix}:`, error);
      throw error;
    }
  }
}