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

export enum WalletStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

@Entity('customer_wallets')
export class CustomerWalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ name: 'customer_id', type: 'varchar', length: 255 })
  customerId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus;

  @Column({ name: 'low_balance_threshold', type: 'decimal', precision: 10, scale: 2, default: 10 })
  lowBalanceThreshold: number;

  @Column({ name: 'auto_recharge', type: 'boolean', default: false })
  autoRecharge: boolean;

  @Column({ name: 'auto_recharge_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoRechargeAmount: number | null;

  @Column({ name: 'auto_recharge_threshold', type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoRechargeThreshold: number | null;

  @Column({ name: 'last_recharge_date', type: 'timestamp', nullable: true })
  lastRechargeDate: Date | null;

  @Column({ name: 'last_debit_date', type: 'timestamp', nullable: true })
  lastDebitDate: Date | null;

  @Column({ name: 'total_credited', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCredited: number;

  @Column({ name: 'total_debited', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalDebited: number;

  @Column({ name: 'total_refunded', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRefunded: number;

  @Column({ name: 'lifetime_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  lifetimeValue: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
