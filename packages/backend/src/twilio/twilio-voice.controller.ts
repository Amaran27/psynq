import { Controller, Post, Body, Res, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import twilio from 'twilio';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('twilio')
export class TwilioVoiceController {
  private readonly twilioClient: twilio.Twilio;
  private readonly accountSid: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly twimlAppSid: string;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get('TWILIO_ACCOUNT_SID') || '';
    this.apiKey = this.configService.get('TWILIO_API_KEY') || '';
    this.apiSecret = this.configService.get('TWILIO_API_SECRET') || '';
    this.twimlAppSid = this.configService.get('TWILIO_TWIML_APP_SID') || '';
    
    if (this.apiKey && this.apiSecret) {
      this.twilioClient = twilio(this.apiKey, this.apiSecret, { accountSid: this.accountSid });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('token')
  async generateToken(@Request() req, @Res() res: Response) {
    const agentId = req.user.userId; // Get user ID from the validated JWT payload

    if (!this.accountSid || !this.apiKey || !this.apiSecret || !this.twimlAppSid) {
      console.error('Twilio credentials or TwiML App SID are not configured on the backend.');
      return res.status(500).json({ error: 'Twilio service is not configured.' });
    }

    try {
      const token = new twilio.jwt.AccessToken(
        this.accountSid,
        this.apiKey,
        this.apiSecret,
        { identity: agentId } // Use the authenticated user's ID as the identity
      );

      const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
        outgoingApplicationSid: this.twimlAppSid,
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