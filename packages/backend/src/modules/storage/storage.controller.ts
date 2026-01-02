import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('recordings/url')
  async getRecordingUrl(
    @Query('key') key: string,
    @Query('expires') expires = 3600,
    @Req() req: any,
  ): Promise<{ url: string }> {
    const orgId = req.context?.organizationId || null;
    const url = await this.storageService.getRecordingUrl(key, orgId, +expires);
    return { url };
  }

  @Delete('recordings')
  async deleteRecording(
    @Query('key') key: string,
    @Req() req: any,
  ): Promise<void> {
    const orgId = req.context?.organizationId || null;
    await this.storageService.deleteRecording(key, orgId);
  }

  @Get('recordings')
  async listRecordings(@Req() req: any): Promise<{ recordings: string[] }> {
    const orgId = req.context?.organizationId || null;
    const recordings = await this.storageService.listRecordings(orgId);
    return { recordings };
  }

  @Post('cleanup')
  async cleanup(@Query('days') days = 30, @Req() req: any): Promise<void> {
    const orgId = req.context?.organizationId || null;
    await this.storageService.cleanupOldRecordings(orgId, +days);
  }

  @Get('health')
  async health(@Req() req: any): Promise<{ healthy: boolean }> {
    const orgId = req.context?.organizationId || null;
    const healthy = await this.storageService.healthCheck(orgId);
    return { healthy };
  }
}
