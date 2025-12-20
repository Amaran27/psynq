import { Controller, Get, Inject } from '@nestjs/common';
import { TelephonyPort } from './ports/telephony.port';

@Controller('health')
export class HealthController {
  constructor(
    @Inject('TELEPHONY_PROVIDER') private readonly telephonyProvider: TelephonyPort
  ) {}

  @Get('telephony')
  async getTelephonyHealth() {
    if (this.telephonyProvider.healthCheck) {
      const ok = await this.telephonyProvider.healthCheck(null);
      return { status: ok ? 'healthy' : 'unhealthy' };
    }
    return { status: 'unknown' };
  }
}
