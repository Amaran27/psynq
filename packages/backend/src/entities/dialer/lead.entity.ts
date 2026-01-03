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

export enum LeadStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  DIALING = 'dialing',
  CONTACTED = 'contacted',
  NOT_INTERESTED = 'not_interested',
  CALLBACK_REQUESTED = 'callback_requested',
  CONVERTED = 'converted',
  DNC = 'dnc',
  FAILED = 'failed',
}

export enum LeadCallOutcome {
  NO_ANSWER = 'no_answer',
  BUSY = 'busy',
  ANSWERED = 'answered',
  VOICEMAIL = 'voicemail',
  WRONG_NUMBER = 'wrong_number',
  DISCONNECTED = 'disconnected',
}

@Entity('leads')
@Index(['campaignId', 'status'])
@Index(['campaignId', 'nextAttemptAt'])
@Index(['phoneNumber', 'campaignId'], { unique: true })
export class LeadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  campaignId: string;

  @ManyToOne(() => CampaignEntity)
  @JoinColumn({ name: 'campaignId' })
  campaign: CampaignEntity;

  @Column()
  @Index()
  phoneNumber: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Column({ nullable: true })
  timezone: string;

  @Column({ type: 'jsonb', default: {} })
  customData: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  attempts: Array<{
    attemptNumber: number;
    timestamp: Date;
    agentId?: string;
    outcome?: LeadCallOutcome;
    callDurationSeconds?: number;
    notes?: string;
  }>;

  @Column({ nullable: true })
  assignedAgentId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  nextAttemptAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  contactedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
