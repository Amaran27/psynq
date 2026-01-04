/**
 * Recording TypeORM Entity (Infrastructure/Adapter Layer)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Recording as RecordingDomain, RecordingStatus, RecordingFormat, RecordingMetadata } from '../domain/recording.entity';

@Entity('recordings')
@Index('idx_recordings_org_created', ['organizationId', 'createdAt'])
@Index('idx_recordings_call_id', ['callId'])
@Index('idx_recordings_status', ['status'])
@Index('idx_recordings_organization_id', ['organizationId'])
export class RecordingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  callId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({
    type: 'enum',
    enum: RecordingFormat,
    default: RecordingFormat.WAV,
  })
  format: RecordingFormat;

  @Column({ type: 'int', default: 0 })
  duration: number; // seconds

  @Column({ type: 'bigint', default: 0 })
  size: number; // bytes

  @Column({
    type: 'enum',
    enum: RecordingStatus,
    default: RecordingStatus.UPLOADING,
  })
  status: RecordingStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: RecordingMetadata;

  @Column({ type: 'timestamp', nullable: true })
  uploadedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  /**
   * Convert TypeORM entity to domain entity
   */
  toDomain(): RecordingDomain {
    return new RecordingDomain({
      id: this.id,
      callId: this.callId,
      organizationId: this.organizationId,
      filePath: this.filePath,
      fileName: this.fileName,
      format: this.format,
      duration: this.duration,
      size: Number(this.size), // Convert bigint to number
      status: this.status,
      metadata: this.metadata,
      uploadedAt: this.uploadedAt,
      deletedAt: this.deletedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  /**
   * Create TypeORM entity from domain entity
   */
  static fromDomain(domain: RecordingDomain): RecordingEntity {
    const entity = new RecordingEntity();
    entity.id = domain.id;
    entity.callId = domain.callId;
    entity.organizationId = domain.organizationId;
    entity.filePath = domain.filePath;
    entity.fileName = domain.fileName;
    entity.format = domain.format;
    entity.duration = domain.duration;
    entity.size = domain.size;
    entity.status = domain.status;
    entity.metadata = domain.metadata;
    entity.uploadedAt = domain.uploadedAt;
    entity.deletedAt = domain.deletedAt;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
