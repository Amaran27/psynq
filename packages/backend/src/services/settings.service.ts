import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SettingEntity } from '../entities/setting.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CryptoUtil } from '../utils/crypto.util';

export interface SettingValidation {
  validate: (value: any) => boolean;
  message: string;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly validationRegistry: Map<string, SettingValidation> = new Map();

  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingsRepository: Repository<SettingEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.validationRegistry.set('telephony.provider', {
      validate: (v) => ['twilio', 'asterisk'].includes(v),
      message: 'Provider must be twilio or asterisk',
    });
    this.validationRegistry.set('storage.provider', {
      validate: (v) => ['local', 's3', 'minio'].includes(v),
      message: 'Storage must be local, s3, or minio',
    });
  }

  async getSetting(orgId: string | null, key: string, includeSecrets = false): Promise<any> {
    const cacheKey = `settings:${orgId || 'system'}:${key}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached !== undefined && cached !== null) {
      return this.processSettingValue(cached, includeSecrets);
    }

    // 1. Try Org-specific
    let setting = orgId 
      ? await this.settingsRepository.findOne({ where: { organizationId: orgId, key } })
      : null;

    // 2. Try System-default
    if (!setting) {
      setting = await this.settingsRepository.findOne({ where: { organizationId: IsNull(), key } });
    }

    if (!setting) return null;

    // Decrypt if secret
    let value = setting.value;
    if (setting.isSecret) {
      value = CryptoUtil.decrypt(value);
    }

    // Cache the plain value (internally)
    await this.cacheManager.set(cacheKey, { value, isSecret: setting.isSecret }, 3600);

    return this.processSettingValue({ value, isSecret: setting.isSecret }, includeSecrets);
  }

  async setSetting(orgId: string | null, key: string, value: any, isSecret = false): Promise<void> {
    const validation = this.validationRegistry.get(key);
    if (validation && !validation.validate(value)) {
      throw new BadRequestException(validation.message);
    }

    let storedValue = value;
    if (isSecret) {
      storedValue = CryptoUtil.encrypt(value);
    }

    let setting = await this.settingsRepository.findOne({ where: { organizationId: orgId === null ? IsNull() : orgId, key } });
    if (!setting) {
      setting = this.settingsRepository.create({ organizationId: orgId as string, key });
    }

    setting.value = storedValue;
    setting.isSecret = isSecret;
    await this.settingsRepository.save(setting);

    // Clear cache
    const cacheKey = `settings:${orgId || 'system'}:${key}`;
    await this.cacheManager.del(cacheKey);
  }

  private processSettingValue(data: any, includeSecrets: boolean): any {
    if (data.isSecret && !includeSecrets) {
      return '********';
    }
    return data.value;
  }
}
