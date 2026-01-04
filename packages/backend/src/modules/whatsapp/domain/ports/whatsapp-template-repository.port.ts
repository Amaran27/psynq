import { WhatsAppTemplate } from '../whatsapp-template.domain';

export interface FindTemplatesFilter {
  organizationId?: string;
  name?: string;
  category?: string;
  language?: string;
  status?: string;
}

export interface WhatsAppTemplateRepository {
  create(template: WhatsAppTemplate): Promise<WhatsAppTemplate>;
  findById(id: string): Promise<WhatsAppTemplate | null>;
  findAll(filter?: FindTemplatesFilter): Promise<WhatsAppTemplate[]>;
  findByOrganization(organizationId: string): Promise<WhatsAppTemplate[]>;
  findByName(organizationId: string, name: string): Promise<WhatsAppTemplate | null>;
  findByExternalId(externalTemplateId: string): Promise<WhatsAppTemplate | null>;
  findApproved(organizationId: string): Promise<WhatsAppTemplate[]>;
  update(template: WhatsAppTemplate): Promise<WhatsAppTemplate>;
  delete(id: string): Promise<void>;
  count(filter?: FindTemplatesFilter): Promise<number>;
}

export const WHATSAPP_TEMPLATE_REPOSITORY_PORT = Symbol('WHATSAPP_TEMPLATE_REPOSITORY_PORT');
