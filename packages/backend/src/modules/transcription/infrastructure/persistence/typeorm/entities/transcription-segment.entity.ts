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
import { TranscriptionEntity } from './transcription.entity';

@Entity('transcription_segments')
@Index(['transcriptionId', 'segmentIndex'])
@Index(['startTime'])
export class TranscriptionSegmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transcription_id', type: 'uuid' })
  transcriptionId: string;

  @ManyToOne(() => TranscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transcription_id' })
  transcription: TranscriptionEntity;

  @Column({ name: 'segment_index', type: 'int' })
  segmentIndex: number;

  @Column({ name: 'start_time', type: 'decimal', precision: 10, scale: 3 })
  startTime: number;

  @Column({ name: 'end_time', type: 'decimal', precision: 10, scale: 3 })
  endTime: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  confidence: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  speaker: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
