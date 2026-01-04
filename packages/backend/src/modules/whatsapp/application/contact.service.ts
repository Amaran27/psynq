import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  WHATSAPP_CONTACT_REPOSITORY_PORT,
  WhatsAppContactRepository,
} from '../domain/ports';
import { WhatsAppContact, ContactStatus } from '../domain/whatsapp-contact.domain';
import { CreateContactDto, UpdateContactDto } from '../dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(WHATSAPP_CONTACT_REPOSITORY_PORT)
    private readonly contactRepository: WhatsAppContactRepository,
  ) {}

  async create(dto: CreateContactDto): Promise<WhatsAppContact> {
    // Check if contact already exists
    const existing = await this.contactRepository.findByPhoneNumber(
      dto.organizationId!,
      dto.phoneNumber,
    );

    if (existing) {
      throw new Error(`Contact with phone number ${dto.phoneNumber} already exists`);
    }

    const contact = new WhatsAppContact(
      crypto.randomUUID(),
      dto.organizationId!,
      dto.phoneNumber,
      dto.status || ContactStatus.ACTIVE,
      dto.name,
      dto.profilePictureUrl,
      undefined,
      undefined,
      0,
      undefined,
      undefined,
      undefined,
      dto.tags || [],
      dto.customFields,
      dto.metadata,
    );

    return this.contactRepository.create(contact);
  }

  async findById(id: string): Promise<WhatsAppContact> {
    const contact = await this.contactRepository.findById(id);
    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }
    return contact;
  }

  async findAll(filter: any): Promise<WhatsAppContact[]> {
    return this.contactRepository.findAll(filter);
  }

  async findByOrganization(organizationId: string): Promise<WhatsAppContact[]> {
    return this.contactRepository.findByOrganization(organizationId);
  }

  async findByPhoneNumber(organizationId: string, phoneNumber: string): Promise<WhatsAppContact | null> {
    return this.contactRepository.findByPhoneNumber(organizationId, phoneNumber);
  }

  async findActive(organizationId: string): Promise<WhatsAppContact[]> {
    return this.contactRepository.findActive(organizationId);
  }

  async findByTags(organizationId: string, tags: string[]): Promise<WhatsAppContact[]> {
    return this.contactRepository.findByTags(organizationId, tags);
  }

  async update(id: string, dto: UpdateContactDto): Promise<WhatsAppContact> {
    const contact = await this.findById(id);

    if (dto.name || dto.profilePictureUrl) {
      contact.updateProfile(dto.name, dto.profilePictureUrl);
    }

    if (dto.tags) {
      // Replace tags
      contact.tags = dto.tags;
    }

    if (dto.customFields) {
      contact.updateCustomFields(dto.customFields);
    }

    if (dto.metadata) {
      contact.updateMetadata(dto.metadata);
    }

    return this.contactRepository.update(contact);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists
    await this.contactRepository.delete(id);
  }

  async optOut(id: string): Promise<WhatsAppContact> {
    const contact = await this.findById(id);
    contact.optOut();
    return this.contactRepository.update(contact);
  }

  async optIn(id: string): Promise<WhatsAppContact> {
    const contact = await this.findById(id);
    contact.optIn();
    return this.contactRepository.update(contact);
  }

  async block(id: string, reason?: string): Promise<WhatsAppContact> {
    const contact = await this.findById(id);
    contact.block(reason);
    return this.contactRepository.update(contact);
  }

  async unblock(id: string): Promise<WhatsAppContact> {
    const contact = await this.findById(id);
    contact.unblock();
    return this.contactRepository.update(contact);
  }

  async addTag(id: string, tag: string): Promise<WhatsAppContact> {
    const contact = await this.findById(id);
    contact.addTag(tag);
    return this.contactRepository.update(contact);
  }

  async removeTag(id: string, tag: string): Promise<WhatsAppContact> {
    const contact = await this.findById(id);
    contact.removeTag(tag);
    return this.contactRepository.update(contact);
  }

  async getContactStats(organizationId: string): Promise<any> {
    const all = await this.contactRepository.findByOrganization(organizationId);

    const stats = {
      total: all.length,
      byStatus: {} as Record<string, number>,
      active: 0,
      optedOut: 0,
      blocked: 0,
      avgMessageCount: 0,
      recentlyActive: 0, // Last 7 days
    };

    let totalMessages = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const c of all) {
      stats.byStatus[c.status] = (stats.byStatus[c.status] || 0) + 1;
      totalMessages += c.messageCount;

      if (c.isActive()) stats.active++;
      if (c.isOptedOut()) stats.optedOut++;
      if (c.isBlocked()) stats.blocked++;

      if (c.lastMessageAt && c.lastMessageAt >= sevenDaysAgo) {
        stats.recentlyActive++;
      }
    }

    stats.avgMessageCount = all.length > 0 ? totalMessages / all.length : 0;

    return stats;
  }
}
