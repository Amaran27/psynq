import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
import { ConfigurationService } from '../../application/configuration.service';

/**
 * Meta WhatsApp Business API Adapter
 * 
 * Integrates with Meta's WhatsApp Business Platform API
 * Configuration is stored in database and managed via UI (no env vars)
 * 
 * API Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
@Injectable()
export class MetaWhatsAppProviderAdapter implements WhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsAppProviderAdapter.name);
  private readonly apiBaseUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly configurationService: ConfigurationService,
  ) {}

  getProviderType(): WhatsAppProviderType {
    return WhatsAppProviderType.META;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResult> {
    // Get configuration from database
    const config = await this.configurationService.findByOrganization(request.organizationId);
    
    if (!config) {
      throw new BadRequestException(
        'WhatsApp not configured for this organization. Please configure in Settings > WhatsApp.',
      );
    }

    if (!config.enabled) {
      throw new BadRequestException('WhatsApp integration is disabled. Enable it in Settings.');
    }

    if (!config.allowOutbound) {
      throw new BadRequestException('Outbound WhatsApp messages are disabled in settings.');
    }

    this.logger.log(`Sending ${request.type} message to ${request.to} (org: ${request.organizationId})`);

    const url = `${this.apiBaseUrl}/${config.phoneNumberId}/messages`;
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
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: config.apiTimeoutMs,
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
    organizationId: string,
    to: string,
    templateName: string,
    language: string,
    parameters: any[],
  ): Promise<SendMessageResult> {
    return this.sendMessage({
      organizationId,
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

    // Get configuration from database
    const config = await this.configurationService.findByOrganization(request.organizationId);
    if (!config || !config.businessAccountId) {
      throw new BadRequestException('WhatsApp Business Account ID not configured');
    }

    const url = `${this.apiBaseUrl}/${config.businessAccountId}/message_templates`;
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
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: config.apiTimeoutMs,
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

  async getTemplateStatus(organizationId: string, templateId: string): Promise<{ status: string; rejectionReason?: string }> {
    const config = await this.configurationService.findByOrganization(organizationId);
    if (!config) {
      throw new BadRequestException('WhatsApp not configured');
    }

    const url = `${this.apiBaseUrl}/${templateId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
          },
          timeout: config.apiTimeoutMs,
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

  async verifyWebhook(organizationId: string, payload: any, signature: string): Promise<boolean> {
    if (!signature) {
      return false;
    }

    const config = await this.configurationService.findByOrganization(organizationId);
    if (!config || !config.webhookVerifyToken) {
      this.logger.warn('Webhook verify token not configured, verification disabled');
      return true; // Allow in development
    }

    // Meta WhatsApp uses X-Hub-Signature-256 header
    const expectedSignature = crypto
      .createHmac('sha256', config.webhookVerifyToken)
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

  async isAvailable(organizationId: string): Promise<boolean> {
    const config = await this.configurationService.findByOrganization(organizationId);
    if (!config || !config.enabled) {
      return false;
    }

    try {
      const url = `${this.apiBaseUrl}/${config.phoneNumberId}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
          },
          timeout: config.apiTimeoutMs,
        }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`WhatsApp API health check failed: ${error.message}`);
      return false;
    }
  }
}
