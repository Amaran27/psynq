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
import { CrmIntegrationEntity } from './crm-integration.entity';

export enum SalesforceEdition {
  ESSENTIALS = 'essentials',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  UNLIMITED = 'unlimited',
  DEVELOPER = 'developer',
}

export enum SalesforceApiVersion {
  V58 = 'v58.0',
  V59 = 'v59.0',
  V60 = 'v60.0',
  V61 = 'v61.0',
}

@Entity('salesforce_connections')
@Index(['crmIntegrationId'])
@Index(['orgId'])
export class SalesforceConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'crm_integration_id' })
  @Index()
  crmIntegrationId: string;

  @ManyToOne(() => CrmIntegrationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crm_integration_id' })
  crmIntegration?: CrmIntegrationEntity;

  // Salesforce Organization Info
  @Column({ type: 'varchar', length: 18, name: 'org_id' })
  orgId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'org_name' })
  orgName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  edition?: SalesforceEdition;

  @Column({ type: 'varchar', length: 10, name: 'api_version', default: SalesforceApiVersion.V61 })
  apiVersion: SalesforceApiVersion;

  // User Info
  @Column({ type: 'varchar', length: 18, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_name' })
  userName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_email' })
  userEmail?: string;

  // API Limits & Quotas
  @Column({ type: 'jsonb', nullable: true, name: 'api_limits', default: {} })
  apiLimits: {
    dailyApiRequests?: {
      max: number;
      remaining: number;
    };
    dailyBulkApiRequests?: {
      max: number;
      remaining: number;
    };
    dailyStreamingApiEvents?: {
      max: number;
      remaining: number;
    };
    dataStorageMB?: {
      max: number;
      remaining: number;
    };
    fileStorageMB?: {
      max: number;
      remaining: number;
    };
  };

  @Column({ type: 'timestamp', nullable: true, name: 'limits_updated_at' })
  limitsUpdatedAt?: Date;

  // Object Metadata
  @Column({ type: 'jsonb', nullable: true, name: 'available_objects', default: [] })
  availableObjects: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'synced_objects', default: [] })
  syncedObjects: string[];

  // Custom Settings
  @Column({ type: 'jsonb', nullable: true, name: 'field_mappings', default: {} })
  fieldMappings: Record<string, Record<string, string>>;

  @Column({ type: 'jsonb', nullable: true, name: 'webhook_config', default: {} })
  webhookConfig: {
    enabled?: boolean;
    url?: string;
    events?: string[];
    secret?: string;
  };

  // Connection Health
  @Column({ type: 'timestamp', nullable: true, name: 'last_health_check' })
  lastHealthCheck?: Date;

  @Column({ type: 'boolean', default: true, name: 'is_healthy' })
  isHealthy: boolean;

  @Column({ type: 'integer', default: 0, name: 'consecutive_failures' })
  consecutiveFailures: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
