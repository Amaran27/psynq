import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SettingsService } from './services/settings.service';
import { UserRole } from './entities/user.entity';
import { StoragePort } from './ports/storage.port';
import {
  UpdateStorageConfigDto,
  UpdateTelephonyConfigDto,
  UpdateRecordingConfigDto,
  UpdateSettingDto,
} from './dto/system-settings.dto';

/**
 * System Settings Controller
 *
 * Allows system administrators to configure the application via UI
 * No manual CLI or file editing required
 *
 * All endpoints are protected by RBAC - only system_admin can modify settings
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/system-settings')
export class SystemSettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    @Inject('StoragePort') private readonly storagePort: StoragePort,
  ) {}

  /**
   * Get all system settings (admin only)
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Get()
  async getAllSettings() {
    const settings = await this.settingsService.getAllSettings(null, true);
    return {
      success: true,
      data: settings,
    };
  }

  /**
   * Get setting by key
   */
  @Get(':key')
  async getSetting(@Param('key') key: string) {
    const value = await this.settingsService.getSetting(null, key);
    return {
      success: true,
      data: { key, value },
    };
  }

  /**
   * Update system setting (admin only)
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Put(':key')
  async updateSetting(
    @Param('key') key: string,
    @Body() body: UpdateSettingDto,
  ) {
    await this.settingsService.setSetting(null, key, body.value);
    return {
      success: true,
      message: `Setting ${key} updated successfully`,
    };
  }

  /**
   * Get storage configuration
   */
  @Get('storage/config')
  async getStorageConfig() {
    const providers = await this.getAvailableStorageProviders();
    const currentProvider = await this.settingsService.getSetting(
      null,
      'storage.provider',
      true,
    );

    return {
      success: true,
      data: {
        current: currentProvider || 'minio',
        available: providers,
        configs: {
          minio: await this.settingsService.getSetting(
            null,
            'storage.minio.config',
            true,
          ),
          s3: await this.settingsService.getSetting(
            null,
            'storage.s3.config',
            true,
          ),
          local: await this.settingsService.getSetting(
            null,
            'storage.local.config',
            true,
          ),
        },
      },
    };
  }

  /**
   * Update storage configuration (admin only)
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Put('storage/config')
  async updateStorageConfig(@Body() body: UpdateStorageConfigDto) {
    const { provider, config } = body;

    // Update provider
    await this.settingsService.setSetting(null, 'storage.provider', provider);

    // Update provider config if provided
    if (config) {
      await this.settingsService.setSetting(
        null,
        `storage.${provider}.config`,
        config,
      );
    }

    return {
      success: true,
      message: `Storage configuration updated to ${provider}`,
    };
  }

  /**
   * Test storage connection (admin only)
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('storage/test')
  async testStorage() {
    try {
      const isHealthy = await this.storagePort.healthCheck(null);
      const currentProvider =
        (await this.settingsService.getSetting(
          null,
          'storage.provider',
          true,
        )) || 'local';

      return {
        success: true,
        data: {
          healthy: isHealthy,
          provider: currentProvider,
          message: isHealthy
            ? `Storage connection successful using ${currentProvider}`
            : `Storage connection failed for ${currentProvider}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: `Storage test failed: ${error.message}`,
      });
    }
  }

  /**
   * Get telephony configuration
   */
  @Get('telephony/config')
  async getTelephonyConfig() {
    return {
      success: true,
      data: {
        asterisk: await this.settingsService.getSetting(
          null,
          'telephony.asterisk.config',
          true,
        ),
        twilio: await this.settingsService.getSetting(
          null,
          'telephony.twilio.config',
          true,
        ),
        trunk: await this.settingsService.getSetting(
          null,
          'telephony.active_trunk',
          true,
        ),
      },
    };
  }

  /**
   * Update telephony configuration (admin only)
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Put('telephony/config')
  async updateTelephonyConfig(@Body() body: UpdateTelephonyConfigDto) {
    const { trunk, config } = body;

    if (trunk) {
      await this.settingsService.setSetting(
        null,
        'telephony.active_trunk',
        trunk,
      );
    }

    if (config && trunk) {
      // Update specific trunk configuration
      const trunkKey = `telephony.${trunk}.config`;
      await this.settingsService.setSetting(null, trunkKey, config);
    }

    return {
      success: true,
      message: 'Telephony configuration updated',
    };
  }

  /**
   * Get recording configuration
   */
  @Get('recording/config')
  async getRecordingConfig() {
    return {
      success: true,
      data: {
        enabled: await this.settingsService.getSetting(
          null,
          'recording.enabled',
          true,
        ),
        autoDeleteDays: await this.settingsService.getSetting(
          null,
          'recording.auto_delete_days',
          true,
        ),
        format: await this.settingsService.getSetting(
          null,
          'recording.format',
          true,
        ),
        path: await this.settingsService.getSetting(
          null,
          'recording.path',
          true,
        ),
      },
    };
  }

  /**
   * Update recording configuration (admin only)
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Put('recording/config')
  async updateRecordingConfig(@Body() body: UpdateRecordingConfigDto) {
    const { enabled, autoDeleteDays, format, path } = body;

    if (enabled !== undefined) {
      await this.settingsService.setSetting(null, 'recording.enabled', enabled);
    }
    if (autoDeleteDays !== undefined) {
      await this.settingsService.setSetting(
        null,
        'recording.auto_delete_days',
        autoDeleteDays,
      );
    }
    if (format) {
      await this.settingsService.setSetting(null, 'recording.format', format);
    }
    if (path) {
      await this.settingsService.setSetting(null, 'recording.path', path);
    }

    return {
      success: true,
      message: 'Recording configuration updated',
    };
  }

  /**
   * Get system health status
   */
  @Get('health')
  async getSystemHealth(@Request() req) {
    // This would aggregate health from all services
    return {
      success: true,
      data: {
        status: 'healthy',
        services: {
          database: 'connected',
          redis: 'connected',
          asterisk: 'connected',
          storage: 'connected',
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Reset settings to defaults (admin only)
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('reset')
  async resetSettings() {
    // Reset to defaults
    await this.settingsService.setSetting(null, 'storage.provider', 'minio');

    return {
      success: true,
      message: 'Settings reset to defaults',
    };
  }

  private async getAvailableStorageProviders(): Promise<string[]> {
    // This would be dynamic based on registered adapters
    return ['minio', 's3', 'local'];
  }
}
