export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACTS = 'contacts',
  TEMPLATE = 'template',
  INTERACTIVE = 'interactive',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export class WhatsAppMessage {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly phoneNumber: string,
    public type: MessageType,
    public direction: MessageDirection,
    public status: MessageStatus,
    public content: Record<string, any>,
    public readonly conversationId?: string,
    public readonly contactId?: string,
    public readonly campaignId?: string,
    public readonly agentId?: string,
    public readonly templateId?: string,
    public mediaUrl?: string,
    public mediaType?: string,
    public mediaSizeBytes?: number,
    public externalMessageId?: string,
    public externalTimestamp?: Date,
    public deliveredAt?: Date,
    public readAt?: Date,
    public failedReason?: string,
    public metadata?: Record<string, any>,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {
    this.validate();
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Message ID is required');
    }
    if (!this.organizationId || this.organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }
    if (!this.phoneNumber || this.phoneNumber.trim() === '') {
      throw new Error('Phone number is required');
    }
    if (!this.isValidPhoneNumber(this.phoneNumber)) {
      throw new Error('Invalid phone number format (must be E.164: +[country][number])');
    }
    if (!this.content || Object.keys(this.content).length === 0) {
      throw new Error('Message content is required');
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[1-15 digits]
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  markAsSent(externalMessageId: string, externalTimestamp?: Date): void {
    this.status = MessageStatus.SENT;
    this.externalMessageId = externalMessageId;
    this.externalTimestamp = externalTimestamp || new Date();
  }

  markAsDelivered(deliveredAt?: Date): void {
    if (this.status !== MessageStatus.SENT) {
      throw new Error('Message must be sent before marking as delivered');
    }
    this.status = MessageStatus.DELIVERED;
    this.deliveredAt = deliveredAt || new Date();
  }

  markAsRead(readAt?: Date): void {
    if (this.status !== MessageStatus.DELIVERED) {
      throw new Error('Message must be delivered before marking as read');
    }
    this.status = MessageStatus.READ;
    this.readAt = readAt || new Date();
  }

  markAsFailed(reason: string): void {
    this.status = MessageStatus.FAILED;
    this.failedReason = reason;
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  isSent(): boolean {
    return this.status === MessageStatus.SENT;
  }

  isDelivered(): boolean {
    return this.status === MessageStatus.DELIVERED;
  }

  isRead(): boolean {
    return this.status === MessageStatus.READ;
  }

  isFailed(): boolean {
    return this.status === MessageStatus.FAILED;
  }

  isInbound(): boolean {
    return this.direction === MessageDirection.INBOUND;
  }

  isOutbound(): boolean {
    return this.direction === MessageDirection.OUTBOUND;
  }

  hasMedia(): boolean {
    return !!this.mediaUrl;
  }

  getDeliveryTime(): number | null {
    if (!this.deliveredAt || !this.externalTimestamp) {
      return null;
    }
    return this.deliveredAt.getTime() - this.externalTimestamp.getTime();
  }

  getReadTime(): number | null {
    if (!this.readAt || !this.deliveredAt) {
      return null;
    }
    return this.readAt.getTime() - this.deliveredAt.getTime();
  }

  toJSON(): any {
    return {
      id: this.id,
      organizationId: this.organizationId,
      phoneNumber: this.phoneNumber,
      type: this.type,
      direction: this.direction,
      status: this.status,
      content: this.content,
      conversationId: this.conversationId,
      contactId: this.contactId,
      campaignId: this.campaignId,
      agentId: this.agentId,
      templateId: this.templateId,
      mediaUrl: this.mediaUrl,
      mediaType: this.mediaType,
      mediaSizeBytes: this.mediaSizeBytes,
      externalMessageId: this.externalMessageId,
      externalTimestamp: this.externalTimestamp,
      deliveredAt: this.deliveredAt,
      readAt: this.readAt,
      failedReason: this.failedReason,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      hasMedia: this.hasMedia(),
      deliveryTimeMs: this.getDeliveryTime(),
      readTimeMs: this.getReadTime(),
    };
  }
}
