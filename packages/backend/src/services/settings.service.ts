import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SettingEntity } from '../entities/setting.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CryptoUtil } from '../utils/crypto.util';
import {
  validateOrReject,
  IsEnum,
  IsString,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { plainToInstance, Expose } from 'class-transformer';

export class AsteriskConfigDto {
  @IsUrl()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  app?: string;

  @IsString()
  @IsOptional()
  endpoint?: string;

  @IsString()
  @IsOptional()
  context?: string;
}

export class TelephonySettingsDto {
  @IsEnum(['asterisk'])
  provider: string;

  @IsOptional()
  @Expose()
  asteriskConfig?: AsteriskConfigDto;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingsRepository: Repository<SettingEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getSetting<T>(
    orgId: string | null,
    key: string,
    includeSecrets = false,
    cls?: new () => T,
  ): Promise<T | any> {
    const cacheKey = `settings:${orgId || 'system'}:${key}`;
    const cached = await this.cacheManager.get(cacheKey);

    let result: any;
    if (cached !== undefined && cached !== null) {
      result = this.processSettingValue(cached, includeSecrets);
    } else {
      // 1. Try Org-specific
      let setting = orgId
        ? await this.settingsRepository.findOne({
            where: { organizationId: orgId, key },
          })
        : null;

      // 2. Try System-default
      if (!setting) {
        setting = await this.settingsRepository.findOne({
          where: { organizationId: IsNull(), key },
        });
      }

      if (!setting) return null;

      // Decrypt if secret
      let value = setting.value;
      if (setting.isSecret) {
        value = CryptoUtil.decrypt(value);
      }

      // Cache the plain value (internally)
      await this.cacheManager.set(
        cacheKey,
        { value, isSecret: setting.isSecret },
        3600,
      );
      result = this.processSettingValue(
        { value, isSecret: setting.isSecret },
        includeSecrets,
      );
    }

    if (cls && result && typeof result === 'object') {
      return plainToInstance(cls, result);
    }
    return result;
  }

  async setSetting(
    orgId: string | null,
    key: string,
    value: any,
    isSecret = false,
  ): Promise<void> {
    // Standard industry validation using classes
    if (key === 'telephony.asterisk.config') {
      const dto = plainToInstance(AsteriskConfigDto, value);
      await validateOrReject(dto).catch((errors) => {
        throw new BadRequestException(errors.toString());
      });
    }

    let storedValue = value;
    if (isSecret) {
      storedValue = CryptoUtil.encrypt(value);
    }

    let setting = await this.settingsRepository.findOne({
      where: { organizationId: orgId === null ? IsNull() : orgId, key },
    });
    if (!setting) {
      setting = this.settingsRepository.create({
        organizationId: orgId as string,
        key,
      });
    }

    setting.value = storedValue;
    setting.isSecret = isSecret;
    await this.settingsRepository.save(setting);

    // Clear cache
    const cacheKey = `settings:${orgId || 'system'}:${key}`;
    await this.cacheManager.del(cacheKey);
  }

  async getAllSettings(
    orgId: string | null,
    includeSecrets = false,
  ): Promise<any[]> {
    const settings = await this.settingsRepository.find({
      where: { organizationId: orgId === null ? IsNull() : orgId },
    });

    return settings.map((setting) => ({
      key: setting.key,
      value: this.processSettingValue(
        { value: setting.value, isSecret: setting.isSecret },
        includeSecrets,
      ),
      isSecret: setting.isSecret,
      updatedAt: setting.updatedAt,
    }));
  }

  private processSettingValue(data: any, includeSecrets: boolean): any {
    if (data.isSecret && !includeSecrets) {
      return '********';
    }
    return data.value;
  }
}
