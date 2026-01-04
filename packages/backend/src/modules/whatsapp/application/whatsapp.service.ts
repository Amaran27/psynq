import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  WHATSAPP_MESSAGE_REPOSITORY_PORT,
  WhatsAppMessageRepository,
  WHATSAPP_CONTACT_REPOSITORY_PORT,
  WhatsAppContactRepository,
  WHATSAPP_PROVIDER_PORT,
  WhatsAppProvider,
} from '../domain/ports';
import { WhatsAppMessage, MessageStatus, MessageDirection, MessageType } from '../domain/whatsapp-message.domain';
import { SendMessageDto, SendTemplateMessageDto } from '../dto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @Inject(WHATSAPP_MESSAGE_REPOSITORY_PORT)
    private readonly messageRepository: WhatsAppMessageRepository,
    @Inject(WHATSAPP_CONTACT_REPOSITORY_PORT)
    private readonly contactRepository: WhatsAppContactRepository,
    @Inject(WHATSAPP_PROVIDER_PORT)
    private readonly provider: WhatsAppProvider,
  ) {}

  async sendMessage(dto: SendMessageDto): Promise<WhatsAppMessage> {
    this.logger.log(`Sending ${dto.type} message to ${dto.to}`);

    // Check if contact exists, create if not
    let contact = await this.contactRepository.findByPhoneNumber(dto.organizationId!, dto.to);
    if (!contact) {
      contact = await this.contactRepository.create({
        id: crypto.randomUUID(),
        organizationId: dto.organizationId!,
        phoneNumber: dto.to,
        status: 'active' as any,
        messageCount: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    // Check if contact can receive messages
    if (!contact.canReceiveMessages()) {
      throw new Error(`Contact ${dto.to} cannot receive messages (status: ${contact.status})`);
    }

    // Create message record
    const message = new WhatsAppMessage(
      crypto.randomUUID(),
      dto.organizationId!,
      dto.to,
      dto.type as MessageType,
      MessageDirection.OUTBOUND,
      MessageStatus.PENDING,
      dto.content,
      dto.conversationId,
      contact.id,
      dto.campaignId,
      dto.agentId,
      dto.templateId,
      dto.mediaUrl,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      dto.metadata,
    );

    const saved = await this.messageRepository.create(message);

    // Send via provider
    try {
      const result = await this.provider.sendMessage({
        to: dto.to,
        type: dto.type,
        content: dto.content,
      });

      saved.markAsSent(result.externalMessageId, result.timestamp);
      await this.messageRepository.update(saved);

      // Update contact
      contact.recordMessage('outbound', result.timestamp);
      await this.contactRepository.update(contact);

      this.logger.log(`Message sent successfully: ${result.externalMessageId}`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`, error.stack);
      saved.markAsFailed(error.message);
      await this.messageRepository.update(saved);
      throw error;
    }
  }

  async sendTemplateMessage(dto: SendTemplateMessageDto, organizationId: string): Promise<WhatsAppMessage> {
    this.logger.log(`Sending template ${dto.templateName} to ${dto.to}`);

    // Check contact
    let contact = await this.contactRepository.findByPhoneNumber(organizationId, dto.to);
    if (!contact) {
      contact = await this.contactRepository.create({
        id: crypto.randomUUID(),
        organizationId,
        phoneNumber: dto.to,
        status: 'active' as any,
        messageCount: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    if (!contact.canReceiveMessages()) {
      throw new Error(`Contact ${dto.to} cannot receive messages`);
    }

    // Create message
    const message = new WhatsAppMessage(
      crypto.randomUUID(),
      organizationId,
      dto.to,
      MessageType.TEMPLATE,
      MessageDirection.OUTBOUND,
      MessageStatus.PENDING,
      { templateName: dto.templateName, language: dto.language, parameters: dto.parameters },
      undefined,
      contact.id,
      dto.campaignId,
      undefined,
      undefined,
    );

    const saved = await this.messageRepository.create(message);

    // Send via provider
    try {
      const result = await this.provider.sendTemplateMessage(
        dto.to,
        dto.templateName,
        dto.language,
        dto.parameters || [],
      );

      saved.markAsSent(result.externalMessageId, result.timestamp);
      await this.messageRepository.update(saved);

      contact.recordMessage('outbound', result.timestamp);
      await this.contactRepository.update(contact);

      return saved;
    } catch (error) {
      saved.markAsFailed(error.message);
      await this.messageRepository.update(saved);
      throw error;
    }
  }

  async findById(id: string): Promise<WhatsAppMessage> {
    const message = await this.messageRepository.findById(id);
    if (!message) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    return message;
  }

  async findAll(filter: any): Promise<WhatsAppMessage[]> {
    return this.messageRepository.findAll(filter);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<WhatsAppMessage[]> {
    return this.messageRepository.findByPhoneNumber(phoneNumber);
  }

  async findByConversation(conversationId: string): Promise<WhatsAppMessage[]> {
    return this.messageRepository.findByConversation(conversationId);
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    // Verify webhook signature
    if (!this.provider.verifyWebhook(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    // Parse webhook events
    const events = this.provider.parseWebhook(payload);

    for (const event of events) {
      this.logger.log(`Processing webhook event: ${event.eventType}`);

      if (event.eventType === 'message.received') {
        // Handle incoming message
        await this.handleIncomingMessage(event);
      } else if (event.eventType.startsWith('message.')) {
        // Handle status update
        await this.handleStatusUpdate(event);
      }
    }
  }

  private async handleIncomingMessage(event: any): Promise<void> {
    // Find or create contact
    let contact = await this.contactRepository.findByPhoneNumber(event.organizationId || 'default', event.from);
    if (!contact) {
      contact = await this.contactRepository.create({
        id: crypto.randomUUID(),
        organizationId: event.organizationId || 'default',
        phoneNumber: event.from,
        status: 'active' as any,
        messageCount: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    // Create message
    const message = new WhatsAppMessage(
      crypto.randomUUID(),
      contact.organizationId,
      event.from,
      event.content.type as MessageType,
      MessageDirection.INBOUND,
      MessageStatus.DELIVERED,
      event.content,
      undefined,
      contact.id,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      event.messageId,
      event.timestamp,
      event.timestamp,
    );

    await this.messageRepository.create(message);

    // Update contact
    contact.recordMessage('inbound', event.timestamp);
    await this.contactRepository.update(contact);
  }

  private async handleStatusUpdate(event: any): Promise<void> {
    if (!event.messageId) {
      return;
    }

    const message = await this.messageRepository.findByExternalId(event.messageId);
    if (!message) {
      this.logger.warn(`Message ${event.messageId} not found for status update`);
      return;
    }

    switch (event.status) {
      case 'sent':
        message.markAsSent(event.messageId, event.timestamp);
        break;
      case 'delivered':
        message.markAsDelivered(event.timestamp);
        break;
      case 'read':
        message.markAsRead(event.timestamp);
        break;
      case 'failed':
        message.markAsFailed(event.metadata?.error?.message || 'Unknown error');
        break;
    }

    await this.messageRepository.update(message);
  }

  async getMessageStats(organizationId: string): Promise<any> {
    const all = await this.messageRepository.findByOrganization(organizationId);

    const stats = {
      total: all.length,
      byStatus: {} as Record<string, number>,
      byDirection: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      deliveryRate: 0,
      readRate: 0,
    };

    let delivered = 0;
    let read = 0;
    const outbound = all.filter(m => m.isOutbound());

    for (const m of all) {
      stats.byStatus[m.status] = (stats.byStatus[m.status] || 0) + 1;
      stats.byDirection[m.direction] = (stats.byDirection[m.direction] || 0) + 1;
      stats.byType[m.type] = (stats.byType[m.type] || 0) + 1;

      if (m.isDelivered() || m.isRead()) delivered++;
      if (m.isRead()) read++;
    }

    stats.deliveryRate = outbound.length > 0 ? (delivered / outbound.length) * 100 : 0;
    stats.readRate = delivered > 0 ? (read / delivered) * 100 : 0;

    return stats;
  }
}
