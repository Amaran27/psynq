import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { UserRole } from './entities/user.entity';
import { SettingsService } from './services/settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':key')
  @Roles(UserRole.ADMIN)
  async getSetting(@Param('key') key: string, @Req() req: any) {
    const { organizationId } = req.context;
    const value = await this.settingsService.getSetting(organizationId, key);
    return { key, value };
  }

  @Post(':key')
  @Roles(UserRole.ADMIN)
  async setSetting(
    @Param('key') key: string,
    @Body() body: { value: any; isSecret?: boolean },
    @Req() req: any,
  ) {
    const { organizationId } = req.context;
    await this.settingsService.setSetting(
      organizationId,
      key,
      body.value,
      body.isSecret,
    );
    return { success: true };
  }

  @Get('system/:key')
  @Roles(UserRole.SYSTEM_ADMIN)
  async getSystemSetting(@Param('key') key: string) {
    const value = await this.settingsService.getSetting(null, key, true); // System admin can see secrets
    return { key, value };
  }
}
