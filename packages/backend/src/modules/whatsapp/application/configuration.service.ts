import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppConfigurationEntity } from '../infrastructure/persistence/typeorm/entities/whatsapp-configuration.entity';
import { WhatsAppConfiguration } from '../domain/whatsapp-configuration.domain';
import { CreateWhatsAppConfigurationDto, UpdateWhatsAppConfigurationDto } from '../dto';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);

  constructor(
    @InjectRepository(WhatsAppConfigurationEntity)
    private readonly configRepository: Repository<WhatsAppConfigurationEntity>,
  ) {}

  async create(dto: CreateWhatsAppConfigurationDto): Promise<WhatsAppConfiguration> {
    // Check if config already exists for organization
    const existing = await this.configRepository.findOne({
      where: { organizationId: dto.organizationId! },
    });

    if (existing) {
      throw new BadRequestException(
        `WhatsApp configuration already exists for organization ${dto.organizationId}`,
      );
    }

    const config = new WhatsAppConfiguration(
      crypto.randomUUID(),
      dto.organizationId!,
      dto.businessAccountId,
      dto.phoneNumberId,
      dto.accessToken,
      dto.phoneNumber,
      dto.enabled ?? true,
      dto.allowInbound ?? true,
      dto.allowOutbound ?? true,
      dto.enableReadReceipts ?? false,
      dto.hourlyMessageLimit ?? 1000,
      dto.maxRetryAttempts ?? 3,
      dto.retryDelayMs ?? 5000,
      dto.apiTimeoutMs ?? 30000,
      dto.webhookUrl,
      dto.webhookVerifyToken,
      dto.businessName,
      dto.businessDescription,
      dto.businessEmail,
      dto.businessWebsite,
      dto.metadata,
    );

    config.validate();

    const entity = this.toEntity(config);
    const saved = await this.configRepository.save(entity);

    this.logger.log(`WhatsApp configuration created for organization ${dto.organizationId}`);
    return this.toDomain(saved);
  }

  async findByOrganization(organizationId: string): Promise<WhatsAppConfiguration | null> {
    const entity = await this.configRepository.findOne({
      where: { organizationId },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findById(id: string): Promise<WhatsAppConfiguration> {
    const entity = await this.configRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`WhatsApp configuration with ID ${id} not found`);
    }

    return this.toDomain(entity);
  }

  async update(id: string, dto: UpdateWhatsAppConfigurationDto): Promise<WhatsAppConfiguration> {
    const config = await this.findById(id);

    // Update fields
    if (dto.businessAccountId) config.businessAccountId = dto.businessAccountId;
    if (dto.phoneNumberId) config.phoneNumberId = dto.phoneNumberId;
    if (dto.accessToken) config.accessToken = dto.accessToken;
    if (dto.phoneNumber) config.phoneNumber = dto.phoneNumber;
    if (dto.enabled !== undefined) config.enabled = dto.enabled;
    if (dto.allowInbound !== undefined) config.allowInbound = dto.allowInbound;
    if (dto.allowOutbound !== undefined) config.allowOutbound = dto.allowOutbound;
    if (dto.enableReadReceipts !== undefined) config.enableReadReceipts = dto.enableReadReceipts;
    if (dto.hourlyMessageLimit) config.hourlyMessageLimit = dto.hourlyMessageLimit;
    if (dto.maxRetryAttempts !== undefined) config.maxRetryAttempts = dto.maxRetryAttempts;
    if (dto.retryDelayMs) config.retryDelayMs = dto.retryDelayMs;
    if (dto.apiTimeoutMs) config.apiTimeoutMs = dto.apiTimeoutMs;
    if (dto.webhookUrl !== undefined) config.webhookUrl = dto.webhookUrl;
    if (dto.webhookVerifyToken !== undefined) config.webhookVerifyToken = dto.webhookVerifyToken;
    if (dto.businessName !== undefined) config.businessName = dto.businessName;
    if (dto.businessDescription !== undefined) config.businessDescription = dto.businessDescription;
    if (dto.businessEmail !== undefined) config.businessEmail = dto.businessEmail;
    if (dto.businessWebsite !== undefined) config.businessWebsite = dto.businessWebsite;
    if (dto.metadata) config.updateMetadata(dto.metadata);

    config.validate();

    const entity = this.toEntity(config);
    const saved = await this.configRepository.save(entity);

    this.logger.log(`WhatsApp configuration updated: ${id}`);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists
    await this.configRepository.delete(id);
    this.logger.log(`WhatsApp configuration deleted: ${id}`);
  }

  async testConnection(organizationId: string): Promise<{ success: boolean; message: string }> {
    const config = await this.findByOrganization(organizationId);

    if (!config) {
      return { success: false, message: 'No configuration found for organization' };
    }

    if (!config.enabled) {
      return { success: false, message: 'WhatsApp integration is disabled' };
    }

    // TODO: Make actual API call to Meta to verify credentials
    // For now, just check if fields are populated
    const hasCredentials =
      config.businessAccountId && config.phoneNumberId && config.accessToken;

    if (!hasCredentials) {
      return { success: false, message: 'Incomplete credentials' };
    }

    return { success: true, message: 'Configuration is valid (not tested with Meta API)' };
  }

  private toEntity(domain: WhatsAppConfiguration): WhatsAppConfigurationEntity {
    const entity = new WhatsAppConfigurationEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.businessAccountId = domain.businessAccountId;
    entity.phoneNumberId = domain.phoneNumberId;
    entity.accessToken = domain.accessToken;
    entity.phoneNumber = domain.phoneNumber;
    entity.enabled = domain.enabled;
    entity.allowInbound = domain.allowInbound;
    entity.allowOutbound = domain.allowOutbound;
    entity.enableReadReceipts = domain.enableReadReceipts;
    entity.hourlyMessageLimit = domain.hourlyMessageLimit;
    entity.maxRetryAttempts = domain.maxRetryAttempts;
    entity.retryDelayMs = domain.retryDelayMs;
    entity.apiTimeoutMs = domain.apiTimeoutMs;
    entity.webhookUrl = domain.webhookUrl || null;
    entity.webhookVerifyToken = domain.webhookVerifyToken || null;
    entity.businessName = domain.businessName || null;
    entity.businessDescription = domain.businessDescription || null;
    entity.businessEmail = domain.businessEmail || null;
    entity.businessWebsite = domain.businessWebsite || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: WhatsAppConfigurationEntity): WhatsAppConfiguration {
    return new WhatsAppConfiguration(
      entity.id,
      entity.organizationId,
      entity.businessAccountId,
      entity.phoneNumberId,
      entity.accessToken,
      entity.phoneNumber,
      entity.enabled,
      entity.allowInbound,
      entity.allowOutbound,
      entity.enableReadReceipts,
      entity.hourlyMessageLimit,
      entity.maxRetryAttempts,
      entity.retryDelayMs,
      entity.apiTimeoutMs,
      entity.webhookUrl ?? undefined,
      entity.webhookVerifyToken ?? undefined,
      entity.businessName ?? undefined,
      entity.businessDescription ?? undefined,
      entity.businessEmail ?? undefined,
      entity.businessWebsite ?? undefined,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
