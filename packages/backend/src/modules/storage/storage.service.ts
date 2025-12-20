import { Injectable, Inject } from '@nestjs/common';
import { StoragePort } from '../../ports/storage.port';

@Injectable()
export class StorageService {
  private readonly logger = new (require('@nestjs/common').Logger)(StorageService.name);

  constructor(@Inject('STORAGE_PROVIDER') private storageAdapter: StoragePort) {}

  async uploadRecording(callId: string, stream: any, contentType: string, organizationId: string | null = null): Promise<string> {
    const timestamp = Date.now();
    const key = `recordings/${callId}/${timestamp}.wav`;
    await this.storageAdapter.upload(organizationId, key, stream, contentType);
    return key;
  }

  async getRecordingUrl(key: string, organizationId: string | null = null, expiresInSeconds = 3600): Promise<string> {
    return this.storageAdapter.getSignedUrl(organizationId, key, expiresInSeconds, 'GET');
  }

  async deleteRecording(key: string, organizationId: string | null = null): Promise<void> {
    await this.storageAdapter.delete(organizationId, key);
  }

  async listRecordings(organizationId: string | null = null): Promise<string[]> {
    return this.storageAdapter.list(organizationId, 'recordings/');
  }

  async cleanupOldRecordings(organizationId: string | null = null, olderThanDays = 30): Promise<void> {
    await this.storageAdapter.applyLifecyclePolicy(organizationId, 'recordings/', olderThanDays);
  }

  async healthCheck(organizationId: string | null = null): Promise<boolean> {
    return this.storageAdapter.healthCheck(organizationId);
  }
}