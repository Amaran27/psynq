import { Controller, Get, Delete, Post, Param, Query } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('recordings/:callId/url')
  async getRecordingUrl(@Param('callId') callId: string, @Query('expires') expires = 3600): Promise<{ url: string }> {
    const url = await this.storageService.getRecordingUrl(callId, +expires);
    return { url };
  }

  @Delete('recordings/:callId')
  async deleteRecording(@Param('callId') callId: string): Promise<void> {
    await this.storageService.deleteRecording(callId);
  }

  @Get('recordings')
  async listRecordings(): Promise<{ recordings: string[] }> {
    const recordings = await this.storageService.listRecordings();
    return { recordings };
  }

  @Post('cleanup')
  async cleanup(@Query('days') days = 30): Promise<void> {
    await this.storageService.cleanupOldRecordings(+days);
  }

  @Get('health')
  async health(): Promise<{ healthy: boolean }> {
    const healthy = await this.storageService.healthCheck();
    return { healthy };
  }
}