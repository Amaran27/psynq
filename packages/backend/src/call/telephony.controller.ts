import { Controller, Post, Body, Inject, UseGuards, Req } from '@nestjs/common';
import { TelephonyPort } from '../ports/telephony.port';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('telephony')
export class TelephonyController {
  constructor(
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('token')
  async getToken(@Req() req: any, @Body('agentId') agentId: string) {
    const orgId = req.user?.organizationId || null;
    const username = req.user?.username;
    return this.telephonyProvider.generateToken(orgId, agentId, username);
  }
}
