/**
 * Wallet TypeORM Entity
 * 
 * Database persistence layer for wallets
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { OrganizationEntity } from '../../../../organizations/infrastructure/persistence/typeorm/entities/organization.entity';
import { WalletTransactionEntity } from './wallet-transaction.entity';

@Entity('wallets')
@Index('IDX_WALLET_ORG', ['organizationId'])
@Index('IDX_WALLET_CUSTOMER', ['organizationId', 'customerId'])
@Index('IDX_WALLET_STATUS', ['status'])
@Index('IDX_WALLET_LOW_BALANCE', ['status', 'balance', 'lowBalanceThreshold'])
export class WalletEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 100 })
  customerId: string;

  @Column({ type: 'varchar', length: 20, default: 'prepaid' })
  type: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  balance: number;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 15, scale: 4, default: 0 })
  creditLimit: number;

  @Column({ name: 'low_balance_threshold', type: 'decimal', precision: 15, scale: 4, default: 10 })
  lowBalanceThreshold: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'auto_recharge', type: 'boolean', default: false })
  autoRecharge: boolean;

  @Column({ name: 'auto_recharge_amount', type: 'decimal', precision: 15, scale: 4, nullable: true })
  autoRechargeAmount: number | null;

  @Column({ name: 'auto_recharge_trigger', type: 'decimal', precision: 15, scale: 4, nullable: true })
  autoRechargeTrigger: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @OneToMany(() => WalletTransactionEntity, transaction => transaction.wallet)
  transactions: WalletTransactionEntity[];
}
