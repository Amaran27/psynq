import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  WhatsAppProvider,
  WhatsAppProviderType,
  SendMessageRequest,
  SendMessageResult,
  WebhookPayload,
  TemplateSubmitRequest,
  TemplateSubmitResult,
} from '../../domain/ports/whatsapp-provider.port';

/**
 * Meta WhatsApp Business API Adapter
 * 
 * Integrates with Meta's WhatsApp Business Platform API
 * Requires: WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
 * 
 * API Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
@Injectable()
export class MetaWhatsAppProviderAdapter implements WhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsAppProviderAdapter.name);
  private readonly apiBaseUrl = 'https://graph.facebook.com/v18.0';
  private readonly apiToken: string;
  private readonly phoneNumberId: string;
  private readonly verifyToken: string;

  constructor(private readonly httpService: HttpService) {
    this.apiToken = process.env.WHATSAPP_API_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';

    if (!this.apiToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp API credentials not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
    }
  }

  getProviderType(): WhatsAppProviderType {
    return WhatsAppProviderType.META;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResult> {
    this.logger.log(`Sending ${request.type} message to ${request.to}`);

    const url = `${this.apiBaseUrl}/${this.phoneNumberId}/messages`;
    const payload: any = {
      messaging_product: 'whatsapp',
      to: request.to,
      type: request.type,
    };

    // Map content based on message type
    switch (request.type) {
      case 'text':
        payload.text = { body: request.content.body || request.content.text };
        break;
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        payload[request.type] = {
          link: request.content.url || request.content.link,
          caption: request.content.caption,
        };
        break;
      case 'location':
        payload.location = request.content;
        break;
      case 'template':
        payload.template = {
          name: request.templateName,
          language: { code: request.templateLanguage || 'en' },
          components: request.templateParameters || [],
        };
        break;
      case 'interactive':
        payload.interactive = request.content;
        break;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const messageId = response.data.messages?.[0]?.id;
      if (!messageId) {
        throw new Error('No message ID returned from WhatsApp API');
      }

      return {
        externalMessageId: messageId,
        status: 'sent',
        timestamp: new Date(),
        metadata: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`, error.stack);
      throw new Error(`WhatsApp API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    language: string,
    parameters: any[],
  ): Promise<SendMessageResult> {
    return this.sendMessage({
      to,
      type: 'template',
      content: {},
      templateName,
      templateLanguage: language,
      templateParameters: parameters,
    });
  }

  async submitTemplate(request: TemplateSubmitRequest): Promise<TemplateSubmitResult> {
    this.logger.log(`Submitting template: ${request.name}`);

    // Note: Template creation requires WhatsApp Business Account ID
    const wabaid = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    if (!wabaid) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID not configured');
    }

    const url = `${this.apiBaseUrl}/${wabaid}/message_templates`;
    const payload = {
      name: request.name,
      category: request.category,
      language: request.language,
      components: request.components,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return {
        externalTemplateId: response.data.id,
        status: response.data.status || 'PENDING',
        metadata: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to submit template: ${error.message}`, error.stack);
      throw new Error(`WhatsApp Template API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getTemplateStatus(templateId: string): Promise<{ status: string; rejectionReason?: string }> {
    const url = `${this.apiBaseUrl}/${templateId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }),
      );

      return {
        status: response.data.status,
        rejectionReason: response.data.rejected_reason,
      };
    } catch (error) {
      this.logger.error(`Failed to get template status: ${error.message}`);
      throw new Error(`WhatsApp API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  verifyWebhook(payload: any, signature: string): boolean {
    if (!signature) {
      return false;
    }

    // Meta WhatsApp uses X-Hub-Signature-256 header
    const appSecret = process.env.WHATSAPP_APP_SECRET || '';
    if (!appSecret) {
      this.logger.warn('WHATSAPP_APP_SECRET not configured, webhook verification disabled');
      return true; // Allow in development
    }

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const signatureValue = signature.replace('sha256=', '');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureValue),
    );
  }

  parseWebhook(payload: any): WebhookPayload[] {
    const webhooks: WebhookPayload[] = [];

    if (!payload.entry) {
      return webhooks;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Message status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            webhooks.push({
              eventType: `message.${status.status}`,
              messageId: status.id,
              timestamp: new Date(status.timestamp * 1000),
              status: status.status,
              metadata: status,
            });
          }
        }

        // Incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            webhooks.push({
              eventType: 'message.received',
              messageId: message.id,
              from: message.from,
              to: value.metadata?.phone_number_id,
              timestamp: new Date(message.timestamp * 1000),
              content: this.parseMessageContent(message),
              metadata: message,
            });
          }
        }

        // Message errors
        if (value.errors) {
          for (const error of value.errors) {
            webhooks.push({
              eventType: 'message.error',
              timestamp: new Date(),
              status: 'failed',
              metadata: error,
            });
          }
        }
      }
    }

    return webhooks;
  }

  private parseMessageContent(message: any): any {
    const type = message.type;
    let content: any = { type };

    switch (type) {
      case 'text':
        content.body = message.text?.body;
        break;
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        content = {
          ...content,
          ...message[type],
          mediaId: message[type]?.id,
          mimeType: message[type]?.mime_type,
          caption: message[type]?.caption,
        };
        break;
      case 'location':
        content.location = message.location;
        break;
      case 'contacts':
        content.contacts = message.contacts;
        break;
      case 'interactive':
        content.interactive = message.interactive;
        break;
    }

    return content;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiToken || !this.phoneNumberId) {
      return false;
    }

    try {
      const url = `${this.apiBaseUrl}/${this.phoneNumberId}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`WhatsApp API health check failed: ${error.message}`);
      return false;
    }
  }
}
