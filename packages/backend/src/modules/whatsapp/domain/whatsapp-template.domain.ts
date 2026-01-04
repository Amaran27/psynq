export enum TemplateCategory {
  MARKETING = 'marketing',
  UTILITY = 'utility',
  AUTHENTICATION = 'authentication',
}

export enum TemplateStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum TemplateLanguage {
  EN = 'en',
  EN_US = 'en_US',
  ES = 'es',
  ES_ES = 'es_ES',
  PT_BR = 'pt_BR',
  FR = 'fr',
  DE = 'de',
  IT = 'it',
  AR = 'ar',
  HI = 'hi',
  ZH_CN = 'zh_CN',
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: { header_text?: string[]; body_text?: string[][] };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export class WhatsAppTemplate {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public name: string,
    public category: TemplateCategory,
    public language: TemplateLanguage,
    public status: TemplateStatus,
    public components: TemplateComponent[],
    public externalTemplateId?: string,
    public externalTemplateName?: string,
    public rejectionReason?: string,
    public metadata?: Record<string, any>,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {
    this.validate();
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Template ID is required');
    }
    if (!this.organizationId || this.organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('Template name is required');
    }
    if (!this.isValidTemplateName(this.name)) {
      throw new Error('Template name must be lowercase letters, numbers, and underscores only');
    }
    if (!this.components || this.components.length === 0) {
      throw new Error('Template must have at least one component');
    }
    this.validateComponents();
  }

  private isValidTemplateName(name: string): boolean {
    // WhatsApp template naming rules: lowercase letters, numbers, underscores
    return /^[a-z0-9_]+$/.test(name);
  }

  private validateComponents(): void {
    const hasBody = this.components.some(c => c.type === 'BODY');
    if (!hasBody) {
      throw new Error('Template must have a BODY component');
    }

    for (const component of this.components) {
      if (component.type === 'HEADER' && !component.format) {
        throw new Error('HEADER component must specify format');
      }
      if (component.type === 'BODY' && !component.text) {
        throw new Error('BODY component must have text');
      }
    }
  }

  markAsPending(): void {
    if (this.status !== TemplateStatus.DRAFT) {
      throw new Error('Only draft templates can be submitted for approval');
    }
    this.status = TemplateStatus.PENDING;
  }

  markAsApproved(externalTemplateId: string, externalTemplateName?: string): void {
    if (this.status !== TemplateStatus.PENDING) {
      throw new Error('Only pending templates can be approved');
    }
    this.status = TemplateStatus.APPROVED;
    this.externalTemplateId = externalTemplateId;
    this.externalTemplateName = externalTemplateName || this.name;
  }

  markAsRejected(reason: string): void {
    if (this.status !== TemplateStatus.PENDING) {
      throw new Error('Only pending templates can be rejected');
    }
    this.status = TemplateStatus.REJECTED;
    this.rejectionReason = reason;
  }

  updateComponents(components: TemplateComponent[]): void {
    if (this.status !== TemplateStatus.DRAFT) {
      throw new Error('Cannot modify non-draft templates');
    }
    this.components = components;
    this.validateComponents();
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  isApproved(): boolean {
    return this.status === TemplateStatus.APPROVED;
  }

  isDraft(): boolean {
    return this.status === TemplateStatus.DRAFT;
  }

  isPending(): boolean {
    return this.status === TemplateStatus.PENDING;
  }

  isRejected(): boolean {
    return this.status === TemplateStatus.REJECTED;
  }

  getVariableCount(): number {
    const bodyComponent = this.components.find(c => c.type === 'BODY');
    if (!bodyComponent || !bodyComponent.text) {
      return 0;
    }
    const matches = bodyComponent.text.match(/\{\{(\d+)\}\}/g);
    return matches ? matches.length : 0;
  }

  hasButtons(): boolean {
    return this.components.some(c => c.type === 'BUTTONS');
  }

  hasMedia(): boolean {
    const header = this.components.find(c => c.type === 'HEADER');
    return !!header && !!header.format && header.format !== 'TEXT';
  }

  toJSON(): any {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      category: this.category,
      language: this.language,
      status: this.status,
      components: this.components,
      externalTemplateId: this.externalTemplateId,
      externalTemplateName: this.externalTemplateName,
      rejectionReason: this.rejectionReason,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      variableCount: this.getVariableCount(),
      hasButtons: this.hasButtons(),
      hasMedia: this.hasMedia(),
    };
  }
}
