import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelephonyPort } from '../ports/telephony.port';
import { Call } from '@psynq/core';
import twilio from 'twilio';

@Injectable()
export class TwilioAdapter implements TelephonyPort {
  private client: twilio.Twilio;
  private onCallReceived: ((call: Call) => void) | null = null;
  private onCallEnded: ((callId: string) => void) | null = null;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || process.env.TWILIO_ACCOUNT_SID;
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    this.client = twilio(accountSid, authToken);
  }

  setCallReceivedCallback(callback: (call: Call) => void) {
    this.onCallReceived = callback;
  }

  setCallEndedCallback(callback: (callId: string) => void) {
    this.onCallEnded = callback;
  }

  async createCall(call: Call): Promise<void> {
    try {
      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }
      await this.client.calls.create({
        to: call.to,
        from: fromNumber,
        twiml: '<Response><Say>Hello, this is a test call from Psynq.</Say><Hangup/></Response>', // Simple TwiML for MVP
      });
      console.log(`Outbound call initiated from ${fromNumber} to ${call.to}`);
    } catch (error) {
      console.error('Failed to create call with Twilio:', error);
    }
  }

  async bridgeCall(callId: string, agentId: string): Promise<void> {
    // For MVP, simulate bridging by updating call status
    // In full implementation, use Twilio conferences or transfers
    console.log(`Bridging call ${callId} to agent ${agentId}`);
    // Placeholder: Implement via Twilio API if needed
  }

  async injectSupervisor(callId: string, supervisorId: string): Promise<void> {
    // Similar to bridge
    console.log(`Injecting supervisor ${supervisorId} into call ${callId}`);
  }

  async endCall(callId: string): Promise<void> {
    try {
      await this.client.calls(callId).update({ status: 'completed' });
      console.log(`Call ${callId} ended`);
    } catch (error) {
      console.error('Failed to end call with Twilio:', error);
    }
  }
}