import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrganizationEntity } from '../../../../entities/organization.entity';

export enum CrmProvider {
  SALESFORCE = 'salesforce',
  ZENDESK = 'zendesk',
  HUBSPOT = 'hubspot',
  ZOHO = 'zoho',
  CUSTOM = 'custom',
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
  ERROR = 'error',
  SYNCING = 'syncing',
  EXPIRED = 'expired',
}

export enum SyncDirection {
  BIDIRECTIONAL = 'bidirectional',
  TO_CRM = 'to_crm',
  FROM_CRM = 'from_crm',
}

@Entity('crm_integrations')
@Index(['organizationId', 'provider'])
@Index(['status'])
export class CrmIntegrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  @Index()
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @Column({ type: 'varchar', length: 50 })
  provider: CrmProvider;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, default: ConnectionStatus.DISCONNECTED })
  status: ConnectionStatus;

  // OAuth & API Configuration
  @Column({ type: 'text', nullable: true, name: 'client_id' })
  clientId?: string;

  @Column({ type: 'text', nullable: true, name: 'client_secret' })
  clientSecret?: string;

  @Column({ type: 'text', nullable: true, name: 'access_token' })
  accessToken?: string;

  @Column({ type: 'text', nullable: true, name: 'refresh_token' })
  refreshToken?: string;

  @Column({ type: 'text', nullable: true, name: 'instance_url' })
  instanceUrl?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'token_expires_at' })
  tokenExpiresAt?: Date;

  // Sync Configuration
  @Column({ type: 'jsonb', nullable: true, name: 'sync_config', default: {} })
  syncConfig: {
    syncDirection?: SyncDirection;
    syncInterval?: number; // minutes
    enableContactSync?: boolean;
    enableLeadSync?: boolean;
    enableAccountSync?: boolean;
    enableCallLogging?: boolean;
    enableTaskCreation?: boolean;
    customFieldMappings?: Record<string, string>;
    filters?: Record<string, any>;
  };

  // Sync Statistics
  @Column({ type: 'timestamp', nullable: true, name: 'last_sync_at' })
  lastSyncAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'next_sync_at' })
  nextSyncAt?: Date;

  @Column({ type: 'integer', default: 0, name: 'total_syncs' })
  totalSyncs: number;

  @Column({ type: 'integer', default: 0, name: 'successful_syncs' })
  successfulSyncs: number;

  @Column({ type: 'integer', default: 0, name: 'failed_syncs' })
  failedSyncs: number;

  @Column({ type: 'integer', default: 0, name: 'records_synced' })
  recordsSynced: number;

  // Error Tracking
  @Column({ type: 'text', nullable: true, name: 'last_error_message' })
  lastErrorMessage?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_error_at' })
  lastErrorAt?: Date;

  // Metadata
  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
