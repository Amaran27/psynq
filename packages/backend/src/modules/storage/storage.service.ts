import { Injectable, Inject } from '@nestjs/common';
import { StoragePort } from '../../ports/storage.port';

@Injectable()
export class StorageService {
  private readonly logger = new (require('@nestjs/common').Logger)(StorageService.name);

  constructor(@Inject('StoragePort') private storageAdapter: StoragePort) {}

  async uploadRecording(callId: string, stream: any, contentType: string): Promise<void> {
    const key = `recordings/${callId}.wav`; // Assume WAV for now
    await this.storageAdapter.upload(key, stream, contentType);
  }

  async getRecordingUrl(callId: string, expiresInSeconds = 3600): Promise<string> {
    const key = `recordings/${callId}.wav`;
    return this.storageAdapter.getSignedUrl(key, expiresInSeconds, 'GET');
  }

  async deleteRecording(callId: string): Promise<void> {
    const key = `recordings/${callId}.wav`;
    await this.storageAdapter.delete(key);
  }

  async listRecordings(): Promise<string[]> {
    return this.storageAdapter.list('recordings/');
  }

  async cleanupOldRecordings(olderThanDays = 30): Promise<void> {
    await this.storageAdapter.applyLifecyclePolicy('recordings/', olderThanDays);
  }

  async healthCheck(): Promise<boolean> {
    return this.storageAdapter.healthCheck();
  }
}