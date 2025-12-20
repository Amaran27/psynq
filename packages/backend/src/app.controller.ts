import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { AppService } from './app.service';
import { AsteriskAdapter } from './adapters/asterisk.adapter';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, @Optional() @Inject(AsteriskAdapter) private readonly asteriskAdapter?: AsteriskAdapter) {}

  @Get('health')
  getHealth(): string {
    return 'OK';
  }

  @Get('health/ari')
  async getAriHealth() {
    if (!this.asteriskAdapter) return { ari: false, error: 'Asterisk adapter not configured' };
    const ok = await this.asteriskAdapter.healthCheck(null);
    return { ari: !!ok };
  }
}
