export enum ContactStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  OPTED_OUT = 'opted_out',
}

export class WhatsAppContact {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public phoneNumber: string,
    public status: ContactStatus,
    public name?: string,
    public profilePictureUrl?: string,
    public lastMessageAt?: Date,
    public lastMessageDirection?: 'inbound' | 'outbound',
    public messageCount: number = 0,
    public optedOutAt?: Date,
    public blockedAt?: Date,
    public blockReason?: string,
    public tags: string[] = [],
    public customFields?: Record<string, any>,
    public metadata?: Record<string, any>,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {
    this.validate();
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Contact ID is required');
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
    if (this.messageCount < 0) {
      throw new Error('Message count cannot be negative');
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[1-15 digits]
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  updateProfile(name?: string, profilePictureUrl?: string): void {
    if (name) this.name = name;
    if (profilePictureUrl) this.profilePictureUrl = profilePictureUrl;
  }

  recordMessage(direction: 'inbound' | 'outbound', timestamp?: Date): void {
    this.messageCount++;
    this.lastMessageAt = timestamp || new Date();
    this.lastMessageDirection = direction;
  }

  optOut(): void {
    if (this.status === ContactStatus.OPTED_OUT) {
      throw new Error('Contact already opted out');
    }
    this.status = ContactStatus.OPTED_OUT;
    this.optedOutAt = new Date();
  }

  optIn(): void {
    if (this.status !== ContactStatus.OPTED_OUT) {
      throw new Error('Contact is not opted out');
    }
    this.status = ContactStatus.ACTIVE;
    this.optedOutAt = undefined;
  }

  block(reason?: string): void {
    if (this.status === ContactStatus.BLOCKED) {
      throw new Error('Contact already blocked');
    }
    this.status = ContactStatus.BLOCKED;
    this.blockedAt = new Date();
    this.blockReason = reason;
  }

  unblock(): void {
    if (this.status !== ContactStatus.BLOCKED) {
      throw new Error('Contact is not blocked');
    }
    this.status = ContactStatus.ACTIVE;
    this.blockedAt = undefined;
    this.blockReason = undefined;
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
  }

  updateCustomFields(fields: Record<string, any>): void {
    this.customFields = { ...this.customFields, ...fields };
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  isActive(): boolean {
    return this.status === ContactStatus.ACTIVE;
  }

  isBlocked(): boolean {
    return this.status === ContactStatus.BLOCKED;
  }

  isOptedOut(): boolean {
    return this.status === ContactStatus.OPTED_OUT;
  }

  canReceiveMessages(): boolean {
    return this.status === ContactStatus.ACTIVE;
  }

  getDaysSinceLastMessage(): number | null {
    if (!this.lastMessageAt) {
      return null;
    }
    const diffMs = new Date().getTime() - this.lastMessageAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  toJSON(): any {
    return {
      id: this.id,
      organizationId: this.organizationId,
      phoneNumber: this.phoneNumber,
      status: this.status,
      name: this.name,
      profilePictureUrl: this.profilePictureUrl,
      lastMessageAt: this.lastMessageAt,
      lastMessageDirection: this.lastMessageDirection,
      messageCount: this.messageCount,
      optedOutAt: this.optedOutAt,
      blockedAt: this.blockedAt,
      blockReason: this.blockReason,
      tags: this.tags,
      customFields: this.customFields,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      canReceiveMessages: this.canReceiveMessages(),
      daysSinceLastMessage: this.getDaysSinceLastMessage(),
    };
  }
}
