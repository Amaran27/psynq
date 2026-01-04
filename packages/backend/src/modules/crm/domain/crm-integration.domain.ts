import { CrmProvider, ConnectionStatus, SyncDirection } from '../infrastructure/persistence/crm-integration.entity';

export class CrmIntegration {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly provider: CrmProvider,
    public name: string,
    public status: ConnectionStatus,
    public description?: string,
    public clientId?: string,
    public clientSecret?: string,
    public accessToken?: string,
    public refreshToken?: string,
    public instanceUrl?: string,
    public tokenExpiresAt?: Date,
    public syncConfig: {
      syncDirection?: SyncDirection;
      syncInterval?: number;
      enableContactSync?: boolean;
      enableLeadSync?: boolean;
      enableAccountSync?: boolean;
      enableCallLogging?: boolean;
      enableTaskCreation?: boolean;
      customFieldMappings?: Record<string, string>;
      filters?: Record<string, any>;
    } = {},
    public lastSyncAt?: Date,
    public nextSyncAt?: Date,
    public totalSyncs: number = 0,
    public successfulSyncs: number = 0,
    public failedSyncs: number = 0,
    public recordsSynced: number = 0,
    public lastErrorMessage?: string,
    public lastErrorAt?: Date,
    public metadata: Record<string, any> = {},
    public isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  /**
   * Validate the CRM integration configuration
   */
  validate(): void {
    const errors: string[] = [];

    // Basic validation
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }
    if (this.name && this.name.length > 255) {
      errors.push('Name must be 255 characters or less');
    }
    if (!this.organizationId) {
      errors.push('Organization ID is required');
    }
    if (!this.provider) {
      errors.push('Provider is required');
    }

    // OAuth validation (when connected)
    if (this.status === ConnectionStatus.CONNECTED) {
      if (!this.accessToken) {
        errors.push('Access token is required for connected integration');
      }
      if (!this.instanceUrl && this.provider === CrmProvider.SALESFORCE) {
        errors.push('Instance URL is required for Salesforce');
      }
    }

    // Sync configuration validation
    if (this.syncConfig.syncInterval && this.syncConfig.syncInterval < 5) {
      errors.push('Sync interval must be at least 5 minutes');
    }
    if (this.syncConfig.syncInterval && this.syncConfig.syncInterval > 10080) {
      errors.push('Sync interval cannot exceed 1 week (10080 minutes)');
    }

    // Token expiration validation
    if (this.tokenExpiresAt && this.tokenExpiresAt < new Date()) {
      if (this.status === ConnectionStatus.CONNECTED) {
        errors.push('Token has expired, status should be EXPIRED');
      }
    }

    if (errors.length > 0) {
      throw new Error(`CRM Integration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Connect the CRM integration
   */
  connect(accessToken: string, refreshToken?: string, instanceUrl?: string, expiresIn?: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.instanceUrl = instanceUrl;
    this.status = ConnectionStatus.CONNECTED;
    
    if (expiresIn) {
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    this.validate();
  }

  /**
   * Disconnect the CRM integration
   */
  disconnect(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiresAt = undefined;
    this.status = ConnectionStatus.DISCONNECTED;
    this.lastErrorMessage = undefined;
    this.lastErrorAt = undefined;
  }

  /**
   * Refresh the access token
   */
  refreshAccessToken(newAccessToken: string, expiresIn?: number): void {
    this.accessToken = newAccessToken;
    
    if (expiresIn) {
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    if (this.status === ConnectionStatus.EXPIRED) {
      this.status = ConnectionStatus.CONNECTED;
    }
  }

  /**
   * Mark token as expired
   */
  expireToken(): void {
    if (this.status === ConnectionStatus.CONNECTED) {
      this.status = ConnectionStatus.EXPIRED;
    }
  }

  /**
   * Start a sync operation
   */
  startSync(): void {
    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot start sync: integration is not connected');
    }
    this.status = ConnectionStatus.SYNCING;
  }

  /**
   * Record a successful sync
   */
  recordSuccessfulSync(recordCount: number): void {
    this.totalSyncs++;
    this.successfulSyncs++;
    this.recordsSynced += recordCount;
    this.lastSyncAt = new Date();
    this.status = ConnectionStatus.CONNECTED;
    this.lastErrorMessage = undefined;
    this.lastErrorAt = undefined;

    // Calculate next sync time
    if (this.syncConfig.syncInterval) {
      this.nextSyncAt = new Date(Date.now() + this.syncConfig.syncInterval * 60 * 1000);
    }
  }

  /**
   * Record a failed sync
   */
  recordFailedSync(errorMessage: string): void {
    this.totalSyncs++;
    this.failedSyncs++;
    this.lastSyncAt = new Date();
    this.lastErrorMessage = errorMessage;
    this.lastErrorAt = new Date();
    this.status = ConnectionStatus.ERROR;
  }

  /**
   * Update sync configuration
   */
  updateSyncConfig(config: Partial<CrmIntegration['syncConfig']>): void {
    this.syncConfig = {
      ...this.syncConfig,
      ...config,
    };
    this.validate();
  }

  /**
   * Enable the integration
   */
  enable(): void {
    this.isActive = true;
  }

  /**
   * Disable the integration
   */
  disable(): void {
    this.isActive = false;
    if (this.status === ConnectionStatus.SYNCING) {
      this.status = ConnectionStatus.CONNECTED;
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(bufferMinutes: number = 5): boolean {
    if (!this.tokenExpiresAt) {
      return false;
    }
    const bufferTime = bufferMinutes * 60 * 1000;
    return this.tokenExpiresAt.getTime() - bufferTime <= Date.now();
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.totalSyncs === 0) {
      return 100;
    }
    return (this.successfulSyncs / this.totalSyncs) * 100;
  }

  /**
   * Check if sync is due
   */
  isSyncDue(): boolean {
    if (!this.isActive || !this.syncConfig.syncInterval || !this.nextSyncAt) {
      return false;
    }
    return this.nextSyncAt <= new Date();
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      provider: this.provider,
      name: this.name,
      description: this.description,
      status: this.status,
      syncConfig: this.syncConfig,
      lastSyncAt: this.lastSyncAt,
      nextSyncAt: this.nextSyncAt,
      totalSyncs: this.totalSyncs,
      successfulSyncs: this.successfulSyncs,
      failedSyncs: this.failedSyncs,
      recordsSynced: this.recordsSynced,
      lastErrorMessage: this.lastErrorMessage,
      lastErrorAt: this.lastErrorAt,
      metadata: this.metadata,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      successRate: this.getSuccessRate(),
      tokenExpired: this.isTokenExpired(),
      syncDue: this.isSyncDue(),
    };
  }
}
