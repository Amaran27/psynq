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
import { DialingSessionEntity } from './dialing-session.entity';

export enum PacingAlgorithm {
  ERLANG_C = 'erlang_c',
  FIXED_RATIO = 'fixed_ratio',
  ADAPTIVE = 'adaptive',
}

export enum PacingStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

/**
 * PacingEngine Entity (TypeORM Adapter)
 * 
 * Manages real-time pacing calculations for predictive dialing.
 * Uses Erlang-C formula to optimize call throughput while maintaining
 * target abandonment rates.
 * 
 * Architecture: This is the database adapter layer.
 * Pure business logic lives in domain/pacing-engine.domain.ts
 */
@Entity('pacing_engines')
@Index(['campaignId', 'status'])
@Index(['sessionId'])
@Index(['organizationId'])
export class PacingEngineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  campaignId: string;

  @ManyToOne(() => CampaignEntity)
  @JoinColumn({ name: 'campaignId' })
  campaign: CampaignEntity;

  @Column({ nullable: true })
  @Index()
  sessionId: string;

  @ManyToOne(() => DialingSessionEntity)
  @JoinColumn({ name: 'sessionId' })
  session: DialingSessionEntity;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column({
    type: 'enum',
    enum: PacingAlgorithm,
    default: PacingAlgorithm.ERLANG_C,
  })
  algorithm: PacingAlgorithm;

  @Column({
    type: 'enum',
    enum: PacingStatus,
    default: PacingStatus.IDLE,
  })
  status: PacingStatus;

  // Pacing Configuration
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3.0 })
  targetAbandonmentRate: number; // Target abandonment rate (e.g., 3%)

  @Column({ type: 'int', default: 10 })
  maxConcurrentCalls: number;

  @Column({ type: 'int', default: 1 })
  linesPerAgent: number;

  @Column({ type: 'int', default: 30 })
  dialTimeoutSeconds: number;

  @Column({ type: 'int', default: 5 })
  minAgentsRequired: number;

  // Real-time Metrics
  @Column({ type: 'int', default: 0 })
  availableAgents: number;

  @Column({ type: 'int', default: 0 })
  busyAgents: number;

  @Column({ type: 'int', default: 0 })
  activeCalls: number;

  @Column({ type: 'int', default: 0 })
  queuedCalls: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgAnswerTimeSeconds: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgCallDurationSeconds: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.5 })
  contactRate: number; // Percentage of calls that connect (e.g., 0.5 = 50%)

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  actualAbandonmentRate: number;

  // Erlang-C Calculation Results
  @Column({ type: 'jsonb', default: {} })
  pacingCalculation: {
    recommendedDialRate?: number; // Calls per minute
    overdialRatio?: number; // How many times to overdial
    waitProbability?: number; // Probability of call waiting
    avgWaitTime?: number; // Average wait time in seconds
    utilizationRate?: number; // Agent utilization percentage
    calculatedAt?: Date;
  };

  // Historical Performance
  @Column({ type: 'int', default: 0 })
  totalCallsDialed: number;

  @Column({ type: 'int', default: 0 })
  totalCallsAnswered: number;

  @Column({ type: 'int', default: 0 })
  totalCallsAbandoned: number;

  @Column({ type: 'int', default: 0 })
  totalCallsConnected: number;

  // Tuning Parameters
  @Column({ type: 'jsonb', nullable: true })
  customParameters: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  stoppedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastCalculationAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
