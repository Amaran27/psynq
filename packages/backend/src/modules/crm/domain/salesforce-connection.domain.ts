import { SalesforceEdition, SalesforceApiVersion } from '../infrastructure/persistence/salesforce-connection.entity';

export class SalesforceConnection {
  constructor(
    public readonly id: string,
    public readonly crmIntegrationId: string,
    public orgId: string,
    public userId: string,
    public apiVersion: SalesforceApiVersion = SalesforceApiVersion.V61,
    public orgName?: string,
    public edition?: SalesforceEdition,
    public userName?: string,
    public userEmail?: string,
    public apiLimits: {
      dailyApiRequests?: { max: number; remaining: number };
      dailyBulkApiRequests?: { max: number; remaining: number };
      dailyStreamingApiEvents?: { max: number; remaining: number };
      dataStorageMB?: { max: number; remaining: number };
      fileStorageMB?: { max: number; remaining: number };
    } = {},
    public limitsUpdatedAt?: Date,
    public availableObjects: string[] = [],
    public syncedObjects: string[] = [],
    public fieldMappings: Record<string, Record<string, string>> = {},
    public webhookConfig: {
      enabled?: boolean;
      url?: string;
      events?: string[];
      secret?: string;
    } = {},
    public lastHealthCheck?: Date,
    public isHealthy: boolean = true,
    public consecutiveFailures: number = 0,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  /**
   * Validate the Salesforce connection
   */
  validate(): void {
    const errors: string[] = [];

    if (!this.orgId || this.orgId.length !== 18) {
      errors.push('Salesforce Org ID must be 18 characters');
    }
    if (!this.userId || this.userId.length !== 18) {
      errors.push('Salesforce User ID must be 18 characters');
    }
    if (!this.crmIntegrationId) {
      errors.push('CRM Integration ID is required');
    }

    // Webhook validation
    if (this.webhookConfig.enabled) {
      if (!this.webhookConfig.url) {
        errors.push('Webhook URL is required when webhooks are enabled');
      }
      if (this.webhookConfig.url && !this.webhookConfig.url.startsWith('https://')) {
        errors.push('Webhook URL must use HTTPS');
      }
      if (!this.webhookConfig.secret) {
        errors.push('Webhook secret is required when webhooks are enabled');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Salesforce Connection validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Update API limits from Salesforce response
   */
  updateApiLimits(limits: SalesforceConnection['apiLimits']): void {
    this.apiLimits = { ...this.apiLimits, ...limits };
    this.limitsUpdatedAt = new Date();
  }

  /**
   * Add synced object
   */
  addSyncedObject(objectName: string): void {
    if (!this.syncedObjects.includes(objectName)) {
      this.syncedObjects.push(objectName);
    }
  }

  /**
   * Remove synced object
   */
  removeSyncedObject(objectName: string): void {
    this.syncedObjects = this.syncedObjects.filter((obj) => obj !== objectName);
  }

  /**
   * Update field mappings for an object
   */
  updateFieldMapping(objectName: string, mappings: Record<string, string>): void {
    this.fieldMappings[objectName] = {
      ...this.fieldMappings[objectName],
      ...mappings,
    };
  }

  /**
   * Configure webhook
   */
  configureWebhook(url: string, events: string[], secret: string): void {
    this.webhookConfig = {
      enabled: true,
      url,
      events,
      secret,
    };
    this.validate();
  }

  /**
   * Disable webhook
   */
  disableWebhook(): void {
    this.webhookConfig = {
      enabled: false,
    };
  }

  /**
   * Record successful health check
   */
  recordHealthCheckSuccess(): void {
    this.lastHealthCheck = new Date();
    this.isHealthy = true;
    this.consecutiveFailures = 0;
  }

  /**
   * Record failed health check
   */
  recordHealthCheckFailure(): void {
    this.lastHealthCheck = new Date();
    this.consecutiveFailures++;
    
    // Mark as unhealthy after 3 consecutive failures
    if (this.consecutiveFailures >= 3) {
      this.isHealthy = false;
    }
  }

  /**
   * Check if API limit is approaching threshold
   */
  isApiLimitCritical(threshold: number = 10): boolean {
    if (!this.apiLimits.dailyApiRequests) {
      return false;
    }
    const { max, remaining } = this.apiLimits.dailyApiRequests;
    const percentageRemaining = (remaining / max) * 100;
    return percentageRemaining <= threshold;
  }

  /**
   * Get available API requests percentage
   */
  getApiRequestsPercentage(): number {
    if (!this.apiLimits.dailyApiRequests) {
      return 100;
    }
    const { max, remaining } = this.apiLimits.dailyApiRequests;
    return (remaining / max) * 100;
  }

  /**
   * Get storage usage percentage
   */
  getDataStoragePercentage(): number {
    if (!this.apiLimits.dataStorageMB) {
      return 0;
    }
    const { max, remaining } = this.apiLimits.dataStorageMB;
    return ((max - remaining) / max) * 100;
  }

  /**
   * Check if connection needs health check
   */
  needsHealthCheck(intervalMinutes: number = 15): boolean {
    if (!this.lastHealthCheck) {
      return true;
    }
    const timeSinceLastCheck = Date.now() - this.lastHealthCheck.getTime();
    return timeSinceLastCheck >= intervalMinutes * 60 * 1000;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      crmIntegrationId: this.crmIntegrationId,
      orgId: this.orgId,
      orgName: this.orgName,
      edition: this.edition,
      apiVersion: this.apiVersion,
      userId: this.userId,
      userName: this.userName,
      userEmail: this.userEmail,
      apiLimits: this.apiLimits,
      limitsUpdatedAt: this.limitsUpdatedAt,
      availableObjects: this.availableObjects,
      syncedObjects: this.syncedObjects,
      fieldMappings: this.fieldMappings,
      webhookConfig: this.webhookConfig,
      lastHealthCheck: this.lastHealthCheck,
      isHealthy: this.isHealthy,
      consecutiveFailures: this.consecutiveFailures,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      apiLimitCritical: this.isApiLimitCritical(),
      apiRequestsPercentage: this.getApiRequestsPercentage(),
      dataStoragePercentage: this.getDataStoragePercentage(),
      needsHealthCheck: this.needsHealthCheck(),
    };
  }
}
