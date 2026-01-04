import { WhatsAppMessage } from '../whatsapp-message.domain';

export interface FindMessagesFilter {
  organizationId?: string;
  phoneNumber?: string;
  conversationId?: string;
  contactId?: string;
  campaignId?: string;
  agentId?: string;
  status?: string;
  direction?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface WhatsAppMessageRepository {
  create(message: WhatsAppMessage): Promise<WhatsAppMessage>;
  createMany(messages: WhatsAppMessage[]): Promise<WhatsAppMessage[]>;
  findById(id: string): Promise<WhatsAppMessage | null>;
  findAll(filter?: FindMessagesFilter): Promise<WhatsAppMessage[]>;
  findByOrganization(organizationId: string): Promise<WhatsAppMessage[]>;
  findByPhoneNumber(phoneNumber: string): Promise<WhatsAppMessage[]>;
  findByConversation(conversationId: string): Promise<WhatsAppMessage[]>;
  findByContact(contactId: string): Promise<WhatsAppMessage[]>;
  findByExternalId(externalMessageId: string): Promise<WhatsAppMessage | null>;
  findPending(): Promise<WhatsAppMessage[]>;
  update(message: WhatsAppMessage): Promise<WhatsAppMessage>;
  delete(id: string): Promise<void>;
  count(filter?: FindMessagesFilter): Promise<number>;
}

export const WHATSAPP_MESSAGE_REPOSITORY_PORT = Symbol('WHATSAPP_MESSAGE_REPOSITORY_PORT');
