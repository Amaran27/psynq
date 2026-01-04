import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  WHATSAPP_TEMPLATE_REPOSITORY_PORT,
  WhatsAppTemplateRepository,
  WHATSAPP_PROVIDER_PORT,
  WhatsAppProvider,
} from '../domain/ports';
import { WhatsAppTemplate, TemplateStatus } from '../domain/whatsapp-template.domain';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @Inject(WHATSAPP_TEMPLATE_REPOSITORY_PORT)
    private readonly templateRepository: WhatsAppTemplateRepository,
    @Inject(WHATSAPP_PROVIDER_PORT)
    private readonly provider: WhatsAppProvider,
  ) {}

  async create(dto: CreateTemplateDto): Promise<WhatsAppTemplate> {
    const template = new WhatsAppTemplate(
      crypto.randomUUID(),
      dto.organizationId!,
      dto.name,
      dto.category,
      dto.language,
      TemplateStatus.DRAFT,
      dto.components,
      undefined,
      undefined,
      undefined,
      dto.metadata,
    );

    return this.templateRepository.create(template);
  }

  async findById(id: string): Promise<WhatsAppTemplate> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async findAll(filter: any): Promise<WhatsAppTemplate[]> {
    return this.templateRepository.findAll(filter);
  }

  async findByOrganization(organizationId: string): Promise<WhatsAppTemplate[]> {
    return this.templateRepository.findByOrganization(organizationId);
  }

  async findApproved(organizationId: string): Promise<WhatsAppTemplate[]> {
    return this.templateRepository.findApproved(organizationId);
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<WhatsAppTemplate> {
    const template = await this.findById(id);

    if (dto.name) template.name = dto.name;
    if (dto.category) template.category = dto.category;
    if (dto.language) template.language = dto.language;
    if (dto.components) template.updateComponents(dto.components);
    if (dto.metadata) template.updateMetadata(dto.metadata);

    return this.templateRepository.update(template);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists
    await this.templateRepository.delete(id);
  }

  async submitForApproval(id: string): Promise<WhatsAppTemplate> {
    const template = await this.findById(id);

    if (!template.isDraft()) {
      throw new Error('Only draft templates can be submitted for approval');
    }

    // Submit to Meta WhatsApp
    try {
      this.logger.log(`Submitting template ${template.name} to WhatsApp`);
      
      const result = await this.provider.submitTemplate({
        name: template.name,
        category: template.category,
        language: template.language,
        components: template.components,
      });

      template.markAsPending();
      template.externalTemplateId = result.externalTemplateId;
      template.externalTemplateName = template.name;

      await this.templateRepository.update(template);

      this.logger.log(`Template ${template.name} submitted successfully: ${result.externalTemplateId}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to submit template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async syncTemplateStatus(id: string): Promise<WhatsAppTemplate> {
    const template = await this.findById(id);

    if (!template.externalTemplateId) {
      throw new Error('Template has no external ID');
    }

    try {
      const status = await this.provider.getTemplateStatus(template.externalTemplateId);

      if (status.status === 'APPROVED') {
        template.markAsApproved(template.externalTemplateId, template.externalTemplateName);
      } else if (status.status === 'REJECTED') {
        template.markAsRejected(status.rejectionReason || 'Rejected by WhatsApp');
      }

      return this.templateRepository.update(template);
    } catch (error) {
      this.logger.error(`Failed to sync template status: ${error.message}`);
      throw error;
    }
  }

  async getTemplateStats(organizationId: string): Promise<any> {
    const all = await this.templateRepository.findByOrganization(organizationId);

    const stats = {
      total: all.length,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      approvalRate: 0,
    };

    let approved = 0;
    const submitted = all.filter(t => t.status !== TemplateStatus.DRAFT);

    for (const t of all) {
      stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
      stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + 1;
      stats.byLanguage[t.language] = (stats.byLanguage[t.language] || 0) + 1;

      if (t.isApproved()) approved++;
    }

    stats.approvalRate = submitted.length > 0 ? (approved / submitted.length) * 100 : 0;

    return stats;
  }
}
