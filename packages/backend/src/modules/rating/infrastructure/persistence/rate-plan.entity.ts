import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from '../../../../entities/organization.entity';

export enum RatePlanType {
  PREPAID = 'prepaid',
  POSTPAID = 'postpaid',
  HYBRID = 'hybrid',
}

export enum RatePlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum ChargeType {
  PER_MINUTE = 'per_minute',
  PER_SECOND = 'per_second',
  PER_CALL = 'per_call',
  PER_SMS = 'per_sms',
  FLAT_RATE = 'flat_rate',
}

export enum RoundingMethod {
  CEIL = 'ceil',
  FLOOR = 'floor',
  ROUND = 'round',
}

@Entity('rate_plans')
export class RatePlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: RatePlanType,
    default: RatePlanType.PREPAID,
  })
  type: RatePlanType;

  @Column({
    type: 'enum',
    enum: RatePlanStatus,
    default: RatePlanStatus.DRAFT,
  })
  status: RatePlanStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'charge_type',
    type: 'enum',
    enum: ChargeType,
    default: ChargeType.PER_MINUTE,
  })
  chargeType: ChargeType;

  @Column({ name: 'base_rate', type: 'decimal', precision: 10, scale: 4, default: 0 })
  baseRate: number;

  @Column({ name: 'minimum_charge', type: 'decimal', precision: 10, scale: 4, default: 0 })
  minimumCharge: number;

  @Column({
    name: 'rounding_method',
    type: 'enum',
    enum: RoundingMethod,
    default: RoundingMethod.CEIL,
  })
  roundingMethod: RoundingMethod;

  @Column({ name: 'rounding_increment', type: 'int', default: 1 })
  roundingIncrement: number;

  @Column({ name: 'free_seconds', type: 'int', default: 0 })
  freeSeconds: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'billing_cycle', type: 'int', default: 30 })
  billingCycle: number;

  @Column({ name: 'grace_period_days', type: 'int', default: 7 })
  gracePeriodDays: number;

  @Column({ name: 'low_balance_threshold', type: 'decimal', precision: 10, scale: 2, default: 10 })
  lowBalanceThreshold: number;

  @Column({ name: 'auto_recharge', type: 'boolean', default: false })
  autoRecharge: boolean;

  @Column({ name: 'auto_recharge_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoRechargeAmount: number | null;

  @Column({ name: 'auto_recharge_threshold', type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoRechargeThreshold: number | null;

  @Column({ name: 'effective_from', type: 'timestamp', nullable: true })
  effectiveFrom: Date | null;

  @Column({ name: 'effective_to', type: 'timestamp', nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
