/**
 * Wallet Transaction TypeORM Entity
 * 
 * Database persistence layer for wallet transactions
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
} from 'typeorm';
import { OrganizationEntity } from '../../../../organizations/infrastructure/persistence/typeorm/entities/organization.entity';
import { WalletEntity } from './wallet.entity';

@Entity('wallet_transactions')
@Index('IDX_WALLET_TX_WALLET', ['walletId'])
@Index('IDX_WALLET_TX_ORG', ['organizationId'])
@Index('IDX_WALLET_TX_TYPE', ['type'])
@Index('IDX_WALLET_TX_STATUS', ['status'])
@Index('IDX_WALLET_TX_REFERENCE', ['reference', 'referenceType'])
@Index('IDX_WALLET_TX_CREATED', ['createdAt'])
export class WalletTransactionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  amount: number;

  @Column({ name: 'balance_before', type: 'decimal', precision: 15, scale: 4 })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 15, scale: 4 })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'initiated_by', type: 'varchar', length: 100, nullable: true })
  initiatedBy: string | null;

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

  @ManyToOne(() => WalletEntity, wallet => wallet.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: WalletEntity;
}
