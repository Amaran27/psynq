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
import { CampaignEntity } from './campaign.entity';

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  CALLBACK_SCHEDULED = 'callback_scheduled',
  NO_ANSWER = 'no_answer',
  BUSY = 'busy',
  FAILED = 'failed',
  CONVERTED = 'converted',
  DNC = 'dnc', // Do Not Call
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('leads')
export class LeadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column({ nullable: true })
  campaignId: string;

  @ManyToOne(() => CampaignEntity)
  @JoinColumn({ name: 'campaignId' })
  campaign: CampaignEntity;

  // Contact Information
  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column()
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  company: string;

  // Lead Management
  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Column({
    type: 'enum',
    enum: LeadPriority,
    default: LeadPriority.MEDIUM,
  })
  priority: LeadPriority;

  @Column({ nullable: true })
  assignedAgentId: string;

  // Attempt Tracking
  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextAttemptAt: Date;

  // Call History
  @Column({ type: 'jsonb', nullable: true })
  callHistory: Array<{
    callId: string;
    timestamp: Date;
    duration: number;
    outcome: string;
    notes?: string;
  }>;

  // Custom Fields
  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  // Notes and Tags
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // Timezone for compliance
  @Column({ nullable: true })
  timezone: string;

  // Conversion tracking
  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  conversionValue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
