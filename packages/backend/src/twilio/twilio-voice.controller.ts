import { Controller, Post, Body, Res, UseGuards, Request, Options } from '@nestjs/common';
import type { Response } from 'express';
import twilio from 'twilio';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from '../services/settings.service';

@Controller('twilio')
export class TwilioVoiceController {
  constructor(private readonly settingsService: SettingsService) {}

  private async getConfig(orgId: string | null) {
    const config = await this.settingsService.getSetting(orgId, 'telephony.twilio.config', true);
    return config || {};
  }

  // Allow preflight (OPTIONS) requests for this route (helps when browser sends
  // Authorization header and triggers a CORS preflight).
  @Options('token')
  handleTokenOptions() {
    return; // CORS middleware will set the appropriate headers
  }

  @UseGuards(JwtAuthGuard)
  @Post('token')
  async generateToken(@Request() req, @Res() res: Response) {
    const agentId = req.user?.userId;
    const orgId = req.user?.organizationId || null;

    if (!agentId) {
      return res.status(400).json({ error: 'User ID missing' });
    }

    const config = await this.getConfig(orgId);
    const { accountSid, apiKey, apiSecret, twimlAppSid } = config;

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid || !accountSid.startsWith('AC')) {
      console.warn('Twilio credentials missing or invalid. Returning dummy token for development.');
      return res.json({
        identity: agentId,
        token: 'dummy_token_for_development',
      });
    }

    try {
      const token = new twilio.jwt.AccessToken(
        accountSid,
        apiKey,
        apiSecret,
        { identity: agentId }
      );

      const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true,
      });

      token.addGrant(voiceGrant);

      return res.json({
        identity: agentId,
        token: token.toJwt(),
      });
    } catch (error) {
      console.error('Error generating Twilio token:', error);
      return res.status(500).json({ error: 'Failed to generate token' });
    }
  }

  // This webhook is called by Twilio, so it should not be guarded.
  @Post('voice')
  handleVoice(@Body() body: any, @Res() res: Response) {
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (body.To) {
      console.log(`TwiML request for outbound call to: ${body.To}`);
      const dial = twiml.dial();
      dial.conference(body.CallSid);
    } else {
      console.log(`TwiML request for inbound call from: ${body.From}`);
      twiml.say('Thank you for calling. Please wait while we connect you.');
      twiml.hangup();
    }

    res.set('Content-Type', 'text/xml');
    res.send(twiml.toString());
  }

  @Post('dequeue')
  handleDequeue(@Body() body: any, @Res() res: Response) {
    const agentId = body.agentId;
    const twiml = new twilio.twiml.VoiceResponse();

    if (!agentId) {
      console.error('Dequeue request received without agentId');
      twiml.say('We are sorry, but no agents are available at the moment. Please call back later.');
      twiml.hangup();
    } else {
      console.log(`Dequeueing call to agent: ${agentId}`);
      const dial = twiml.dial();
      dial.client(agentId);
    }

    res.set('Content-Type', 'text/xml');
    res.send(twiml.toString());
  }
}