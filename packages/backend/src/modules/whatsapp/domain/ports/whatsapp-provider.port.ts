export enum WhatsAppProviderType {
  META = 'meta',
  TWILIO = 'twilio',
  MESSAGEBIRD = 'messagebird',
}

export interface SendMessageRequest {
  organizationId: string; // Required for database configuration lookup
  to: string;
  type: string;
  content: Record<string, any>;
  templateName?: string;
  templateLanguage?: string;
  templateParameters?: any[];
}

export interface SendMessageResult {
  externalMessageId: string;
  status: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  eventType: string;
  messageId?: string;
  from?: string;
  to?: string;
  timestamp: Date;
  status?: string;
  content?: any;
  metadata?: Record<string, any>;
}

export interface TemplateSubmitRequest {
  organizationId: string; // Required for database configuration lookup
  name: string;
  category: string;
  language: string;
  components: any[];
}

export interface TemplateSubmitResult {
  externalTemplateId: string;
  status: string;
  metadata?: Record<string, any>;
}

export interface WhatsAppProvider {
  getProviderType(): WhatsAppProviderType;
  sendMessage(request: SendMessageRequest): Promise<SendMessageResult>;
  sendTemplateMessage(organizationId: string, to: string, templateName: string, language: string, parameters: any[]): Promise<SendMessageResult>;
  submitTemplate(request: TemplateSubmitRequest): Promise<TemplateSubmitResult>;
  getTemplateStatus(organizationId: string, templateId: string): Promise<{ status: string; rejectionReason?: string }>;
  verifyWebhook(organizationId: string, payload: any, signature: string): Promise<boolean>;
  parseWebhook(payload: any): WebhookPayload[];
  isAvailable(organizationId: string): Promise<boolean>;
}

export const WHATSAPP_PROVIDER_PORT = Symbol('WHATSAPP_PROVIDER_PORT');
