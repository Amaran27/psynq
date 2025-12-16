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

  async createCall(call: Call): Promise<string | undefined> {
    try {
      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }

      // This TwiML instructs Twilio to dial the recipient and place them in a conference
      // named after our internal call ID (which should be the Twilio Call SID).
      const twiml = `<Response><Dial><Conference>${call.id}</Conference></Dial></Response>`;

      const created = await this.client.calls.create({
        to: call.to,
        from: fromNumber,
        twiml: twiml,
      });

      console.log(`Outbound call initiated to ${call.to} and placed in conference ${call.id} — Twilio SID: ${created.sid}`);
      return created.sid;
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

  async findQueueByName(queueName: string): Promise<any> {
    const queues = await this.client.queues.list();
    return queues.find((q: any) => q.friendlyName === queueName);
  }

  async getFirstCallFromQueue(queueSid: string): Promise<any> {
    const members = await this.client.queues(queueSid).members.list({ limit: 1 });
    return members.length > 0 ? members[0] : undefined;
  }

  async redirectCall(callSid: string, twiml: string): Promise<void> {
    try {
      await this.client.calls(callSid).update({ twiml });
      console.log(`Redirected call ${callSid}`);
    } catch (error) {
      console.error(`Failed to redirect call ${callSid}:`, error);
    }
  }
}