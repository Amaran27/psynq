import { WhatsAppContact } from '../whatsapp-contact.domain';

export interface FindContactsFilter {
  organizationId?: string;
  phoneNumber?: string;
  status?: string;
  tags?: string[];
}

export interface WhatsAppContactRepository {
  create(contact: WhatsAppContact): Promise<WhatsAppContact>;
  findById(id: string): Promise<WhatsAppContact | null>;
  findAll(filter?: FindContactsFilter): Promise<WhatsAppContact[]>;
  findByOrganization(organizationId: string): Promise<WhatsAppContact[]>;
  findByPhoneNumber(organizationId: string, phoneNumber: string): Promise<WhatsAppContact | null>;
  findActive(organizationId: string): Promise<WhatsAppContact[]>;
  findByTags(organizationId: string, tags: string[]): Promise<WhatsAppContact[]>;
  update(contact: WhatsAppContact): Promise<WhatsAppContact>;
  delete(id: string): Promise<void>;
  count(filter?: FindContactsFilter): Promise<number>;
}

export const WHATSAPP_CONTACT_REPOSITORY_PORT = Symbol('WHATSAPP_CONTACT_REPOSITORY_PORT');
