import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrganizationEntity } from '../../../../../../entities/organization.entity';

export enum TranscriptionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TranscriptionProvider {
  WHISPER = 'whisper',
  GOOGLE = 'google',
  AZURE = 'azure',
  AWS = 'aws',
}

export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  FLAC = 'flac',
  OGG = 'ogg',
  M4A = 'm4a',
}

@Entity('transcriptions')
@Index(['organizationId', 'status'])
@Index(['callId'])
@Index(['recordingId'])
@Index(['provider'])
@Index(['createdAt'])
export class TranscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ name: 'call_id', type: 'uuid', nullable: true })
  callId: string | null;

  @Column({ name: 'recording_id', type: 'uuid', nullable: true })
  recordingId: string | null;

  @Column({ name: 'audio_url', type: 'varchar', length: 500 })
  audioUrl: string;

  @Column({
    name: 'audio_format',
    type: 'enum',
    enum: AudioFormat,
    default: AudioFormat.WAV,
  })
  audioFormat: AudioFormat;

  @Column({ name: 'audio_duration_seconds', type: 'int', default: 0 })
  audioDurationSeconds: number;

  @Column({ name: 'audio_size_bytes', type: 'bigint', default: 0 })
  audioSizeBytes: number;

  @Column({
    type: 'enum',
    enum: TranscriptionStatus,
    default: TranscriptionStatus.PENDING,
  })
  status: TranscriptionStatus;

  @Column({
    type: 'enum',
    enum: TranscriptionProvider,
    default: TranscriptionProvider.WHISPER,
  })
  provider: TranscriptionProvider;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  confidence: number | null;

  @Column({ name: 'processing_time_ms', type: 'int', nullable: true })
  processingTimeMs: number | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
