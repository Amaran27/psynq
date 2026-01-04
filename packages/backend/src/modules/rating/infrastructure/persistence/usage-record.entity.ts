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
import { OrganizationEntity } from '../../../../entities/organization.entity';
import { RatePlanEntity } from './rate-plan.entity';
import { CustomerWalletEntity } from './customer-wallet.entity';

export enum UsageType {
  VOICE_INBOUND = 'voice_inbound',
  VOICE_OUTBOUND = 'voice_outbound',
  SMS_INBOUND = 'sms_inbound',
  SMS_OUTBOUND = 'sms_outbound',
  DATA_TRANSFER = 'data_transfer',
  API_CALL = 'api_call',
}

export enum RatingStatus {
  PENDING = 'pending',
  RATED = 'rated',
  FAILED = 'failed',
  DISPUTED = 'disputed',
}

@Entity('usage_records')
@Index(['organizationId', 'customerId'])
@Index(['ratePlanId'])
@Index(['ratingStatus'])
@Index(['startTime'])
export class UsageRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ name: 'customer_id', type: 'varchar', length: 255 })
  customerId: string;

  @Column({ name: 'rate_plan_id', type: 'uuid' })
  ratePlanId: string;

  @ManyToOne(() => RatePlanEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rate_plan_id' })
  ratePlan: RatePlanEntity;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  walletId: string | null;

  @ManyToOne(() => CustomerWalletEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'wallet_id' })
  wallet: CustomerWalletEntity | null;

  @Column({
    name: 'usage_type',
    type: 'enum',
    enum: UsageType,
    default: UsageType.VOICE_OUTBOUND,
  })
  usageType: UsageType;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 4, default: 0 })
  unitCost: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({
    name: 'rating_status',
    type: 'enum',
    enum: RatingStatus,
    default: RatingStatus.PENDING,
  })
  ratingStatus: RatingStatus;

  @Column({ name: 'rated_at', type: 'timestamp', nullable: true })
  ratedAt: Date | null;

  @Column({ name: 'source_number', type: 'varchar', length: 50, nullable: true })
  sourceNumber: string | null;

  @Column({ name: 'destination_number', type: 'varchar', length: 50, nullable: true })
  destinationNumber: string | null;

  @Column({ name: 'call_id', type: 'varchar', length: 255, nullable: true })
  callId: string | null;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string | null;

  @Column({ name: 'rating_batch_id', type: 'uuid', nullable: true })
  ratingBatchId: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
