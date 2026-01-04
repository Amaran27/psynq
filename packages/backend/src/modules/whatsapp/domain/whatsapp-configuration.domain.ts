export class WhatsAppConfiguration {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public businessAccountId: string,
    public phoneNumberId: string,
    public accessToken: string,
    public phoneNumber: string,
    public enabled: boolean = true,
    public allowInbound: boolean = true,
    public allowOutbound: boolean = true,
    public enableReadReceipts: boolean = false,
    public hourlyMessageLimit: number = 1000,
    public maxRetryAttempts: number = 3,
    public retryDelayMs: number = 5000,
    public apiTimeoutMs: number = 30000,
    public webhookUrl?: string,
    public webhookVerifyToken?: string,
    public businessName?: string,
    public businessDescription?: string,
    public businessEmail?: string,
    public businessWebsite?: string,
    public metadata?: Record<string, any>,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {
    this.validate();
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Configuration ID is required');
    }
    if (!this.organizationId || this.organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }
    if (!this.businessAccountId || this.businessAccountId.trim() === '') {
      throw new Error('Business Account ID is required');
    }
    if (!this.phoneNumberId || this.phoneNumberId.trim() === '') {
      throw new Error('Phone Number ID is required');
    }
    if (!this.accessToken || this.accessToken.trim() === '') {
      throw new Error('Access Token is required');
    }
    if (!this.phoneNumber || this.phoneNumber.trim() === '') {
      throw new Error('Phone Number is required');
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(this.phoneNumber)) {
      throw new Error('Phone number must be in E.164 format (e.g., +14155552671)');
    }

    if (this.hourlyMessageLimit <= 0) {
      throw new Error('Hourly message limit must be positive');
    }

    if (this.maxRetryAttempts < 0) {
      throw new Error('Max retry attempts cannot be negative');
    }

    if (this.retryDelayMs < 0) {
      throw new Error('Retry delay cannot be negative');
    }

    if (this.apiTimeoutMs <= 0) {
      throw new Error('API timeout must be positive');
    }

    // Validate email if provided
    if (this.businessEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.businessEmail)) {
        throw new Error('Invalid business email format');
      }
    }
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  updateCredentials(businessAccountId: string, phoneNumberId: string, accessToken: string): void {
    this.businessAccountId = businessAccountId;
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.validate();
  }

  updateWebhook(webhookUrl?: string, webhookVerifyToken?: string): void {
    this.webhookUrl = webhookUrl;
    this.webhookVerifyToken = webhookVerifyToken;
  }

  updateRateLimits(hourlyMessageLimit: number, maxRetryAttempts: number, retryDelayMs: number): void {
    if (hourlyMessageLimit <= 0) {
      throw new Error('Hourly message limit must be positive');
    }
    if (maxRetryAttempts < 0) {
      throw new Error('Max retry attempts cannot be negative');
    }
    if (retryDelayMs < 0) {
      throw new Error('Retry delay cannot be negative');
    }

    this.hourlyMessageLimit = hourlyMessageLimit;
    this.maxRetryAttempts = maxRetryAttempts;
    this.retryDelayMs = retryDelayMs;
  }

  updateBusinessProfile(
    businessName?: string,
    businessDescription?: string,
    businessEmail?: string,
    businessWebsite?: string,
  ): void {
    if (businessEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(businessEmail)) {
        throw new Error('Invalid business email format');
      }
    }

    this.businessName = businessName;
    this.businessDescription = businessDescription;
    this.businessEmail = businessEmail;
    this.businessWebsite = businessWebsite;
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      businessAccountId: this.businessAccountId,
      phoneNumberId: this.phoneNumberId,
      accessToken: '***REDACTED***', // Never expose token in JSON
      phoneNumber: this.phoneNumber,
      enabled: this.enabled,
      allowInbound: this.allowInbound,
      allowOutbound: this.allowOutbound,
      enableReadReceipts: this.enableReadReceipts,
      hourlyMessageLimit: this.hourlyMessageLimit,
      maxRetryAttempts: this.maxRetryAttempts,
      retryDelayMs: this.retryDelayMs,
      apiTimeoutMs: this.apiTimeoutMs,
      webhookUrl: this.webhookUrl,
      webhookVerifyToken: this.webhookVerifyToken ? '***REDACTED***' : undefined,
      businessName: this.businessName,
      businessDescription: this.businessDescription,
      businessEmail: this.businessEmail,
      businessWebsite: this.businessWebsite,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
