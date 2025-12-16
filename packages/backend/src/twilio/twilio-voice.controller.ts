import { Controller, Get, Post, Body, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import twilio from 'twilio';
import { ConfigService } from '@nestjs/config';

@Controller('twilio')
export class TwilioVoiceController {
  private readonly twilioClient: twilio.Twilio;
  private readonly accountSid: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly twimlAppSid: string;

  constructor(private readonly configService: ConfigService) {
    // Get Twilio credentials from environment
    this.accountSid = this.configService.get('TWILIO_ACCOUNT_SID') || process.env.TWILIO_ACCOUNT_SID || '';
    this.apiKey = this.configService.get('TWILIO_API_KEY') || process.env.TWILIO_API_KEY || '';
    this.apiSecret = this.configService.get('TWILIO_API_SECRET') || process.env.TWILIO_API_SECRET || '';
    this.twimlAppSid = this.configService.get('TWILIO_TWIML_APP_SID') || process.env.TWILIO_TWIML_APP_SID || '';
    
    // Initialize Twilio client
    this.twilioClient = twilio(this.apiKey, this.apiSecret, { accountSid: this.accountSid });
  }

  @Get('token')
  async generateToken(@Res() res: Response) {
    try {
      if (!this.accountSid || !this.apiKey || !this.apiSecret) {
        return res.status(500).json({ error: 'Twilio credentials not configured' });
      }

      // Create a new TwiML application if not exists
      if (!this.twimlAppSid) {
        console.log('Creating TwiML app for voice testing...');
        const app = await this.twilioClient.applications.create({
          friendlyName: 'Psynq Voice Test',
          voiceMethod: 'POST',
          voiceUrl: `${this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000'}/twilio/voice`,
        });
        console.log(`Created TwiML app with SID: ${app.sid}`);
        
        // Save the app SID for future use
        // In a real app, you'd store this in your database
        const newTwimlAppSid = app.sid;
        
        // Generate a new capability token
        const token = new twilio.jwt.AccessToken(
          this.accountSid,
          this.apiKey,
          this.apiSecret,
          { identity: 'user' }
        );
        
        // Add voice grant
        const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
          outgoingApplicationSid: newTwimlAppSid,
          incomingAllow: true, // Allow incoming calls
        });
        
        token.addGrant(voiceGrant);
        
        // Set identity
        token.identity = 'voice-test-user';
        
        return res.json({
          token: token.toJwt(),
          twimlAppSid: newTwimlAppSid
        });
      }
      
      // Generate a new capability token
      const token = new twilio.jwt.AccessToken(
        this.accountSid,
        this.apiKey,
        this.apiSecret,
        { identity: 'user' }
      );
      
      // Add voice grant
      const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
        outgoingApplicationSid: this.twimlAppSid,
        incomingAllow: true, // Allow incoming calls
      });
      
      token.addGrant(voiceGrant);
      
      // Set identity
      token.identity = 'voice-test-user';
      
      return res.json({
        token: token.toJwt(),
        twimlAppSid: this.twimlAppSid
      });
    } catch (error) {
      console.error('Error generating Twilio token:', error);
      return res.status(500).json({ error: 'Failed to generate token' });
    }
  }

  @Post('voice')
  handleVoice(@Body() body: any, @Res() res: Response, @Query('message') message?: string) {
    try {
      console.log('Twilio Voice Request:', body);
      
      // Get the message from query parameters or use default
      const spokenMessage = message || body.message || 'This is a test call from Twilio JavaScript SDK to check DND bypass functionality.';
      
      // Create TwiML response
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Check if this is an outgoing call
      if (body.To) {
        twiml.say({ voice: 'woman', language: 'en-IN' }, spokenMessage);
        twiml.pause({ length: 1 });
        twiml.say({ voice: 'woman', language: 'en-IN' }, 'If you can hear this message, the DND bypass is working. Thank you for testing.');
      } else {
        // Handle incoming calls
        twiml.say({ voice: 'woman', language: 'en-IN' }, 'Thank you for calling Psynq test line. This is a test of Twilio voice capabilities.');
        twiml.pause({ length: 1 });
        twiml.say({ voice: 'woman', language: 'en-IN' }, 'This call is testing DND bypass functionality.');
      }
      
      res.set('Content-Type', 'text/xml');
      return res.send(twiml.toString());
    } catch (error) {
      console.error('Error in Twilio voice handler:', error);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: 'woman', language: 'en-IN' }, 'An error occurred while processing your call.');
      res.set('Content-Type', 'text/xml');
      return res.send(twiml.toString());
    }
  }
}