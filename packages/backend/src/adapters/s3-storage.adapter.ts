import { Injectable, Logger } from '@nestjs/common';
import { StoragePort } from '../ports/storage.port';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { SettingsService } from '../services/settings.service';

@Injectable()
export class S3StorageAdapter implements StoragePort {
  private readonly logger = new Logger(S3StorageAdapter.name);

  constructor(private readonly settingsService: SettingsService) {}

  private async getClient(
    orgId: string | null,
  ): Promise<{ client: S3Client; bucket: string }> {
    const config = await this.settingsService.getSetting(
      orgId,
      'storage.s3.config',
      true,
    );
    if (!config || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error(
        `S3 configuration missing for organization ${orgId || 'system'}`,
      );
    }

    const client = new S3Client({
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    return { client, bucket: config.bucket || 'psynq-recordings' };
  }

  async upload(
    orgId: string | null,
    key: string,
    stream: Readable,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: stream,
          ContentType: contentType,
          Metadata: metadata,
        },
      });
      await upload.done();
    } catch (error) {
      this.logger.error(`Failed to upload ${key} to S3:`, error);
      throw error;
    }
  }

  async getSignedUrl(
    orgId: string | null,
    key: string,
    expiresInSeconds: number,
    operation: 'GET' | 'PUT',
  ): Promise<string> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      const command =
        operation === 'GET'
          ? new GetObjectCommand({ Bucket: bucket, Key: key })
          : new PutObjectCommand({ Bucket: bucket, Key: key });
      return await getSignedUrl(client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}:`, error);
      throw error;
    }
  }

  async delete(orgId: string | null, key: string): Promise<void> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error) {
      this.logger.error(`Failed to delete ${key} from S3:`, error);
      throw error;
    }
  }

  async list(orgId: string | null, prefix: string): Promise<string[]> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      const response = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
      );
      return (response.Contents || [])
        .map((obj) => obj.Key || '')
        .filter((k) => k);
    } catch (error) {
      this.logger.error(
        `Failed to list objects in S3 with prefix ${prefix}:`,
        error,
      );
      throw error;
    }
  }

  async healthCheck(orgId: string | null): Promise<boolean> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return true;
    } catch (error) {
      return false;
    }
  }

  async applyLifecyclePolicy(
    orgId: string | null,
    prefix: string,
    olderThanDays: number,
  ): Promise<void> {
    try {
      const { client, bucket } = await this.getClient(orgId);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      const response = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
      );
      const objects = response.Contents || [];
      for (const obj of objects) {
        if (obj.LastModified && obj.LastModified < cutoff && obj.Key) {
          await client.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to apply lifecycle policy for ${prefix}:`,
        error,
      );
      throw error;
    }
  }
}
