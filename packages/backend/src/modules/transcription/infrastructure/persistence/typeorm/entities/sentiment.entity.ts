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
import { TranscriptionEntity } from './transcription.entity';

export enum SentimentScore {
  VERY_NEGATIVE = 'very_negative',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  POSITIVE = 'positive',
  VERY_POSITIVE = 'very_positive',
}

export enum EmotionType {
  ANGER = 'anger',
  DISGUST = 'disgust',
  FEAR = 'fear',
  JOY = 'joy',
  SADNESS = 'sadness',
  SURPRISE = 'surprise',
  NEUTRAL = 'neutral',
}

@Entity('sentiments')
@Index(['organizationId', 'transcriptionId'])
@Index(['callId'])
@Index(['score'])
@Index(['createdAt'])
export class SentimentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ name: 'transcription_id', type: 'uuid' })
  transcriptionId: string;

  @ManyToOne(() => TranscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transcription_id' })
  transcription: TranscriptionEntity;

  @Column({ name: 'segment_id', type: 'uuid', nullable: true })
  segmentId: string | null;

  @Column({ name: 'call_id', type: 'uuid', nullable: true })
  callId: string | null;

  @Column({
    type: 'enum',
    enum: SentimentScore,
    default: SentimentScore.NEUTRAL,
  })
  score: SentimentScore;

  @Column({ name: 'score_value', type: 'decimal', precision: 4, scale: 3 })
  scoreValue: number;

  @Column({ type: 'decimal', precision: 4, scale: 3 })
  magnitude: number;

  @Column({
    type: 'enum',
    enum: EmotionType,
    nullable: true,
  })
  emotion: EmotionType | null;

  @Column({ name: 'emotion_confidence', type: 'decimal', precision: 5, scale: 4, nullable: true })
  emotionConfidence: number | null;

  @Column({ type: 'jsonb', default: '[]' })
  keywords: string[];

  @Column({ type: 'jsonb', default: '[]' })
  entities: Array<{ text: string; type: string; sentiment: number }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
