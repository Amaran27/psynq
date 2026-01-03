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
import { OrganizationEntity } from '../organization.entity';
import { CampaignEntity } from '../campaign.entity';

export enum DialingMode {
  PREVIEW = 'preview',
  PROGRESSIVE = 'progressive',
  PREDICTIVE = 'predictive',
  POWER = 'power',
}

export enum SessionStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('dialing_sessions')
@Index(['campaignId', 'status'])
export class DialingSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  campaignId: string;

  @ManyToOne(() => CampaignEntity)
  @JoinColumn({ name: 'campaignId' })
  campaign: CampaignEntity;

  @Column({
    type: 'enum',
    enum: DialingMode,
    default: DialingMode.PROGRESSIVE,
  })
  mode: DialingMode;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.IDLE,
  })
  status: SessionStatus;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  // Pacing configuration
  @Column({ type: 'int', default: 1 })
  linesPerAgent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.03 })
  targetAbandonmentRate: number;

  @Column({ type: 'int', default: 10 })
  maxConcurrentCalls: number;

  @Column({ type: 'int', default: 30 })
  dialTimeoutSeconds: number;

  // Statistics
  @Column({ type: 'int', default: 0 })
  leadsProcessed: number;

  @Column({ type: 'int', default: 0 })
  callsAttempted: number;

  @Column({ type: 'int', default: 0 })
  callsAnswered: number;

  @Column({ type: 'int', default: 0 })
  callsAbandoned: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgWaitTimeSeconds: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgTalkTimeSeconds: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  conversionRate: number;

  // Active agents
  @Column({ type: 'jsonb', default: [] })
  activeAgentIds: string[];

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
