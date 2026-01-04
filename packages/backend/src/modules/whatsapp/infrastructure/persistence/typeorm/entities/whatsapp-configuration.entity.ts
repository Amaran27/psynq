import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from '../../../../../../entities/organization.entity';

@Entity('whatsapp_configurations')
@Index('IDX_WHATSAPP_CONFIG_ORG', ['organizationId'])
export class WhatsAppConfigurationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  // Meta WhatsApp Business API credentials
  @Column({ type: 'varchar', length: 200 })
  businessAccountId: string;

  @Column({ type: 'varchar', length: 200 })
  phoneNumberId: string;

  @Column({ type: 'varchar', length: 500 })
  accessToken: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string; // E.164 format

  // Webhook configuration
  @Column({ type: 'varchar', length: 500, nullable: true })
  webhookUrl: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  webhookVerifyToken: string | null;

  // Feature flags
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'boolean', default: true })
  allowInbound: boolean;

  @Column({ type: 'boolean', default: true })
  allowOutbound: boolean;

  @Column({ type: 'boolean', default: false })
  enableReadReceipts: boolean;

  // Rate limiting (messages per hour)
  @Column({ type: 'int', default: 1000 })
  hourlyMessageLimit: number;

  // Retry configuration
  @Column({ type: 'int', default: 3 })
  maxRetryAttempts: number;

  @Column({ type: 'int', default: 5000 })
  retryDelayMs: number;

  // Timeout configuration
  @Column({ type: 'int', default: 30000 })
  apiTimeoutMs: number;

  // Business profile
  @Column({ type: 'varchar', length: 200, nullable: true })
  businessName: string | null;

  @Column({ type: 'text', nullable: true })
  businessDescription: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  businessEmail: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  businessWebsite: string | null;

  // Additional settings (JSON)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
