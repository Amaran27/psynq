import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

export enum CampaignType {
  PREVIEW = 'preview',
  PROGRESSIVE = 'progressive',
  PREDICTIVE = 'predictive',
  POWER = 'power',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DialMode {
  PREVIEW = 'preview',
  PROGRESSIVE = 'progressive',
  PREDICTIVE = 'predictive',
  POWER = 'power',
}

@Entity('campaigns')
export class CampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
    default: CampaignType.PREVIEW,
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({
    type: 'enum',
    enum: DialMode,
    default: DialMode.PREVIEW,
  })
  dialMode: DialMode;

  // Schedule
  @Column({ type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    timezone?: string;
    workDays?: number[]; // 0-6 (Sunday-Saturday)
    startHour?: number;
    endHour?: number;
  };

  // Configuration
  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ type: 'int', default: 60 })
  retryIntervalMinutes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.03, nullable: true })
  abandonmentRate: number; // For predictive dialer

  @Column({ type: 'int', default: 1, nullable: true })
  linesPerAgent: number; // For power/predictive dialer

  // Lead list association
  @Column({ nullable: true })
  leadListId: string;

  // Statistics (denormalized for performance)
  @Column({ type: 'int', default: 0 })
  totalLeads: number;

  @Column({ type: 'int', default: 0 })
  contactedLeads: number;

  @Column({ type: 'int', default: 0 })
  successfulCalls: number;

  @Column({ type: 'int', default: 0 })
  failedAttempts: number;

  @Column({ type: 'int', default: 0 })
  avgCallDurationSeconds: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
