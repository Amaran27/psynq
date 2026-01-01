#!/usr/bin/env python3
"""
Part 10: Recording & Storage Implementation
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_recording():
    """Generate Recording & Storage detailed work items"""
    print("\nGenerating Recording & Storage...")
    items = []
    phase = 'Phase: Infrastructure & Platform'
    
    # Epic: Call Recording
    epic = 'Epic: Call Recording System'
    items.append(create_item(epic, 'Epic', phase, 'High',
        '''Automatic and on-demand call recording.

Features:
- Auto-record all calls (configurable)
- On-demand recording toggle
- Stereo recording (agent + caller)
- Recording playback
- Download recordings
- Retention policies
- Storage in MinIO (S3-compatible)

Compliance:
- Recording consent announcements
- Pause/resume for PCI compliance
- Access controls by role''', 95, 21, labels='Recording,Storage'))

    # Task: Recording Service
    items.append(create_item(
        'Task: Implement Call Recording Service',
        'Task', epic, 'High',
        '''File: packages/backend/src/modules/recording/services/recording.service.ts

```typescript
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Recording, RecordingStatus, RecordingFormat } from '../entities/recording.entity';
import { Call } from '../../calls/entities/call.entity';
import { AriClientService } from '../../telephony/services/ari-client.service';
import { StorageService } from '../../storage/storage.service';
import { RedisService } from '../../redis/redis.service';
import { StartRecordingDto, StopRecordingDto } from '../dto';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private readonly recordingFormat: RecordingFormat;
  private readonly autoRecord: boolean;

  constructor(
    @InjectRepository(Recording)
    private readonly recordingRepo: Repository<Recording>,
    @InjectRepository(Call)
    private readonly callRepo: Repository<Call>,
    private readonly config: ConfigService,
    private readonly ari: AriClientService,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
  ) {
    this.recordingFormat = this.config.get('recording.format', RecordingFormat.WAV);
    this.autoRecord = this.config.get('recording.autoRecord', true);
  }

  async startRecording(callId: string, dto?: StartRecordingDto): Promise<Recording> {
    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call) {
      throw new NotFoundException(`Call ${callId} not found`);
    }

    // Check if already recording
    const existingRecording = await this.redis.get(`call:${callId}:recording`);
    if (existingRecording) {
      throw new ForbiddenException('Call is already being recorded');
    }

    // Generate recording name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const recordingName = `${call.tenantId}/${callId}/${timestamp}`;

    try {
      // Start recording via ARI
      const ariRecording = await this.ari.startRecording({
        name: recordingName,
        format: this.recordingFormat,
        maxDurationSeconds: dto?.maxDuration || 7200, // 2 hours max
        maxSilenceSeconds: dto?.maxSilence || 0, // 0 = no silence detection
        beep: false,
        terminateOn: 'none',
        ifExists: 'overwrite',
      }, call.bridgeId);

      // Create recording record
      const recording = this.recordingRepo.create({
        callId,
        tenantId: call.tenantId,
        status: RecordingStatus.RECORDING,
        format: this.recordingFormat,
        ariRecordingName: recordingName,
        startedAt: new Date(),
        initiatedBy: dto?.initiatedBy || 'system',
      });

      const savedRecording = await this.recordingRepo.save(recording);

      // Cache recording state
      await this.redis.set(
        `call:${callId}:recording`,
        savedRecording.id,
        'EX',
        7200,
      );

      this.logger.log(`Recording started for call ${callId}: ${savedRecording.id}`);

      return savedRecording;

    } catch (error) {
      this.logger.error(`Failed to start recording for call ${callId}: ${error.message}`);
      throw error;
    }
  }

  async stopRecording(callId: string, dto?: StopRecordingDto): Promise<Recording> {
    const recordingId = await this.redis.get(`call:${callId}:recording`);
    if (!recordingId) {
      throw new NotFoundException('No active recording for this call');
    }

    const recording = await this.recordingRepo.findOne({ 
      where: { id: recordingId } 
    });
    
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    try {
      // Stop recording via ARI
      await this.ari.stopRecording(recording.ariRecordingName);

      // Update recording status
      recording.status = RecordingStatus.PROCESSING;
      recording.endedAt = new Date();
      recording.duration = Math.floor(
        (recording.endedAt.getTime() - recording.startedAt.getTime()) / 1000
      );

      await this.recordingRepo.save(recording);

      // Clear cache
      await this.redis.del(`call:${callId}:recording`);

      // Process recording (upload to MinIO)
      await this.processRecording(recording);

      this.logger.log(`Recording stopped for call ${callId}: ${recording.id}`);

      return recording;

    } catch (error) {
      this.logger.error(`Failed to stop recording for call ${callId}: ${error.message}`);
      throw error;
    }
  }

  async pauseRecording(callId: string): Promise<void> {
    const recordingId = await this.redis.get(`call:${callId}:recording`);
    if (!recordingId) {
      throw new NotFoundException('No active recording for this call');
    }

    const recording = await this.recordingRepo.findOne({ 
      where: { id: recordingId } 
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    await this.ari.pauseRecording(recording.ariRecordingName);

    recording.status = RecordingStatus.PAUSED;
    await this.recordingRepo.save(recording);

    this.logger.log(`Recording paused for call ${callId}`);
  }

  async resumeRecording(callId: string): Promise<void> {
    const recordingId = await this.redis.get(`call:${callId}:recording`);
    if (!recordingId) {
      throw new NotFoundException('No active recording for this call');
    }

    const recording = await this.recordingRepo.findOne({ 
      where: { id: recordingId } 
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    await this.ari.resumeRecording(recording.ariRecordingName);

    recording.status = RecordingStatus.RECORDING;
    await this.recordingRepo.save(recording);

    this.logger.log(`Recording resumed for call ${callId}`);
  }

  private async processRecording(recording: Recording): Promise<void> {
    try {
      // Get recording file from Asterisk
      const fileBuffer = await this.ari.getRecordingFile(recording.ariRecordingName);

      // Generate storage path
      const storagePath = `recordings/${recording.tenantId}/${recording.callId}/${recording.id}.${recording.format}`;

      // Upload to MinIO
      const fileUrl = await this.storage.upload(
        storagePath,
        fileBuffer,
        `audio/${recording.format}`,
      );

      // Update recording
      recording.status = RecordingStatus.COMPLETED;
      recording.fileUrl = fileUrl;
      recording.fileSize = fileBuffer.length;

      await this.recordingRepo.save(recording);

      // Delete from Asterisk
      await this.ari.deleteRecording(recording.ariRecordingName);

      this.logger.log(`Recording processed: ${recording.id}`);

    } catch (error) {
      recording.status = RecordingStatus.FAILED;
      recording.error = error.message;
      await this.recordingRepo.save(recording);

      this.logger.error(`Recording processing failed: ${error.message}`);
      throw error;
    }
  }

  async getRecording(tenantId: string, recordingId: string): Promise<Recording> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId, tenantId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    return recording;
  }

  async getPlaybackUrl(tenantId: string, recordingId: string): Promise<string> {
    const recording = await this.getRecording(tenantId, recordingId);

    if (recording.status !== RecordingStatus.COMPLETED) {
      throw new ForbiddenException('Recording not ready for playback');
    }

    // Generate signed URL (1 hour expiry)
    return this.storage.getSignedUrl(recording.fileUrl, 3600);
  }

  async getDownloadUrl(tenantId: string, recordingId: string): Promise<string> {
    return this.getPlaybackUrl(tenantId, recordingId);
  }

  // Event handlers for auto-recording

  @OnEvent('call.answered')
  async handleCallAnswered(event: { callId: string; tenantId: string }) {
    if (!this.autoRecord) return;

    try {
      await this.startRecording(event.callId, { initiatedBy: 'auto' });
    } catch (error) {
      this.logger.error(`Auto-recording failed for call ${event.callId}: ${error.message}`);
    }
  }

  @OnEvent('call.ended')
  async handleCallEnded(event: { callId: string }) {
    try {
      await this.stopRecording(event.callId);
    } catch (error) {
      // Recording might not exist (call wasn't recorded)
      if (error.message !== 'No active recording for this call') {
        this.logger.error(`Stop recording failed: ${error.message}`);
      }
    }
  }
}
```

File: packages/backend/src/modules/recording/entities/recording.entity.ts

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Call } from '../../calls/entities/call.entity';

export enum RecordingStatus {
  RECORDING = 'recording',
  PAUSED = 'paused',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum RecordingFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  OGG = 'ogg',
}

@Entity('recordings')
@Index(['tenantId', 'callId'])
@Index(['tenantId', 'createdAt'])
export class Recording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'call_id' })
  callId: string;

  @ManyToOne(() => Call)
  @JoinColumn({ name: 'call_id' })
  call: Call;

  @Column({
    type: 'enum',
    enum: RecordingStatus,
    default: RecordingStatus.RECORDING,
  })
  status: RecordingStatus;

  @Column({
    type: 'enum',
    enum: RecordingFormat,
    default: RecordingFormat.WAV,
  })
  format: RecordingFormat;

  @Column({ name: 'ari_recording_name', nullable: true })
  ariRecordingName: string;

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string;

  @Column({ name: 'file_size', nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  duration: number; // seconds

  @Column({ name: 'initiated_by', default: 'system' })
  initiatedBy: string;

  @Column({ nullable: true })
  error: string;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

Database Schema:
```sql
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    call_id UUID NOT NULL REFERENCES calls(id),
    status VARCHAR(20) NOT NULL DEFAULT 'recording',
    format VARCHAR(10) NOT NULL DEFAULT 'wav',
    ari_recording_name VARCHAR(255),
    file_url TEXT,
    file_size BIGINT,
    duration INTEGER,
    initiated_by VARCHAR(50) DEFAULT 'system',
    error TEXT,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_recording_status CHECK (status IN ('recording', 'paused', 'processing', 'completed', 'failed')),
    CONSTRAINT chk_recording_format CHECK (format IN ('wav', 'mp3', 'ogg'))
);

CREATE INDEX idx_recordings_tenant_call ON recordings(tenant_id, call_id);
CREATE INDEX idx_recordings_tenant_date ON recordings(tenant_id, created_at);
```

API Endpoints:
- POST /calls/:id/recording/start
- POST /calls/:id/recording/stop
- POST /calls/:id/recording/pause
- POST /calls/:id/recording/resume
- GET /recordings/:id
- GET /recordings/:id/playback
- GET /recordings/:id/download

Storage:
- MinIO bucket: psynq-recordings
- Path: recordings/{tenant_id}/{call_id}/{recording_id}.{format}
- Signed URLs for playback/download

Acceptance Criteria:
- Auto-recording on call answer (configurable)
- On-demand start/stop
- Pause/resume for PCI compliance
- Upload to MinIO after call ends
- Playback with signed URL
- Download with signed URL
- Role-based access control''',
        98, 5, 10, 'Backend,Recording'))

    # Task: Storage Service
    items.append(create_item(
        'Task: Implement MinIO Storage Service',
        'Task', epic, 'High',
        '''File: packages/backend/src/modules/storage/storage.service.ts

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;

  private readonly buckets = {
    recordings: 'psynq-recordings',
    reports: 'psynq-reports',
    voicemails: 'psynq-voicemails',
    uploads: 'psynq-uploads',
  };

  constructor(private readonly config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.config.get('minio.endpoint', 'minio'),
      port: this.config.get('minio.port', 9000),
      useSSL: this.config.get('minio.useSSL', false),
      accessKey: this.config.get('minio.accessKey'),
      secretKey: this.config.get('minio.secretKey'),
    });
  }

  async onModuleInit() {
    await this.ensureBuckets();
  }

  private async ensureBuckets(): Promise<void> {
    for (const [name, bucket] of Object.entries(this.buckets)) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket);
          this.logger.log(`Created bucket: ${bucket}`);

          // Set retention policy for recordings (90 days)
          if (name === 'recordings') {
            await this.setRetentionPolicy(bucket, 90);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to create bucket ${bucket}: ${error.message}`);
      }
    }
  }

  async upload(
    path: string,
    data: Buffer | NodeJS.ReadableStream,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const bucket = this.getBucketFromPath(path);
    const objectPath = this.getObjectPath(path);

    try {
      await this.client.putObject(
        bucket,
        objectPath,
        data,
        data instanceof Buffer ? data.length : undefined,
        {
          'Content-Type': contentType,
          ...metadata,
        },
      );

      this.logger.debug(`Uploaded: ${bucket}/${objectPath}`);
      return `${bucket}/${objectPath}`;

    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  async download(path: string): Promise<Buffer> {
    const bucket = this.getBucketFromPath(path);
    const objectPath = this.getObjectPath(path);

    try {
      const stream = await this.client.getObject(bucket, objectPath);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

    } catch (error) {
      this.logger.error(`Download failed: ${error.message}`);
      throw error;
    }
  }

  async getSignedUrl(path: string, expirySeconds: number = 3600): Promise<string> {
    const bucket = this.getBucketFromPath(path);
    const objectPath = this.getObjectPath(path);

    try {
      return await this.client.presignedGetObject(
        bucket,
        objectPath,
        expirySeconds,
      );
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw error;
    }
  }

  async getSignedUploadUrl(
    path: string,
    expirySeconds: number = 3600,
  ): Promise<{ url: string; fields: Record<string, string> }> {
    const bucket = this.getBucketFromPath(path);
    const objectPath = this.getObjectPath(path);

    try {
      const policy = this.client.newPostPolicy();
      policy.setBucket(bucket);
      policy.setKey(objectPath);
      policy.setExpires(new Date(Date.now() + expirySeconds * 1000));

      const result = await this.client.presignedPostPolicy(policy);

      return {
        url: result.postURL,
        fields: result.formData,
      };
    } catch (error) {
      this.logger.error(`Failed to generate upload URL: ${error.message}`);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    const bucket = this.getBucketFromPath(path);
    const objectPath = this.getObjectPath(path);

    try {
      await this.client.removeObject(bucket, objectPath);
      this.logger.debug(`Deleted: ${bucket}/${objectPath}`);
    } catch (error) {
      this.logger.error(`Delete failed: ${error.message}`);
      throw error;
    }
  }

  async deleteMany(paths: string[]): Promise<void> {
    const byBucket = new Map<string, string[]>();

    paths.forEach(path => {
      const bucket = this.getBucketFromPath(path);
      const objectPath = this.getObjectPath(path);
      const existing = byBucket.get(bucket) || [];
      existing.push(objectPath);
      byBucket.set(bucket, existing);
    });

    for (const [bucket, objects] of byBucket) {
      try {
        await this.client.removeObjects(bucket, objects);
        this.logger.debug(`Deleted ${objects.length} objects from ${bucket}`);
      } catch (error) {
        this.logger.error(`Batch delete failed: ${error.message}`);
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    const bucket = this.getBucketFromPath(path);
    const objectPath = this.getObjectPath(path);

    try {
      await this.client.statObject(bucket, objectPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getMetadata(path: string): Promise<Record<string, any>> {
    const bucket = this.getBucketFromPath(path);
    const objectPath = this.getObjectPath(path);

    try {
      const stat = await this.client.statObject(bucket, objectPath);
      return {
        size: stat.size,
        contentType: stat.metaData['content-type'],
        lastModified: stat.lastModified,
        etag: stat.etag,
        metadata: stat.metaData,
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata: ${error.message}`);
      throw error;
    }
  }

  private async setRetentionPolicy(bucket: string, days: number): Promise<void> {
    // MinIO lifecycle configuration for retention
    const lifecycle = {
      Rule: [
        {
          ID: 'retention-policy',
          Status: 'Enabled',
          Expiration: {
            Days: days,
          },
        },
      ],
    };

    try {
      await this.client.setBucketLifecycle(bucket, lifecycle);
      this.logger.log(`Set ${days}-day retention for ${bucket}`);
    } catch (error) {
      this.logger.warn(`Failed to set retention policy: ${error.message}`);
    }
  }

  private getBucketFromPath(path: string): string {
    const parts = path.split('/');
    if (parts[0] in this.buckets) {
      return parts[0];
    }
    // Default bucket based on path prefix
    if (path.startsWith('recordings/')) return this.buckets.recordings;
    if (path.startsWith('reports/')) return this.buckets.reports;
    if (path.startsWith('voicemails/')) return this.buckets.voicemails;
    return this.buckets.uploads;
  }

  private getObjectPath(path: string): string {
    const parts = path.split('/');
    // Remove bucket name if present
    if (Object.values(this.buckets).includes(parts[0])) {
      return parts.slice(1).join('/');
    }
    return path;
  }
}
```

Configuration:
```yaml
# config/storage.yaml
minio:
  endpoint: minio
  port: 9000
  useSSL: false
  accessKey: ${MINIO_ACCESS_KEY}
  secretKey: ${MINIO_SECRET_KEY}
```

Buckets:
- psynq-recordings: Call recordings (90-day retention)
- psynq-reports: Generated reports
- psynq-voicemails: Voicemail recordings
- psynq-uploads: User uploads

Features:
- Bucket auto-creation
- Retention policies
- Signed URLs for secure access
- Pre-signed POST for direct uploads
- Batch delete
- Metadata retrieval

Acceptance Criteria:
- All buckets created on startup
- Retention policies applied
- Signed URLs expire correctly
- Large file uploads work
- No credentials in URLs
- No hardcoded secrets''',
        95, 4, 8, 'Backend,Storage,MinIO'))

    return items

if __name__ == '__main__':
    generate_recording()
