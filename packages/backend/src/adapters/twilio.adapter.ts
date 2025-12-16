import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelephonyPort } from '../ports/telephony.port';
import { Call } from '@psynq/core';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import twilio from 'twilio';

@Injectable()
export class TwilioAdapter implements TelephonyPort {
  private readonly logger = new (require('@nestjs/common').Logger)(TwilioAdapter.name);
  private client: twilio.Twilio | null;
  private onCallReceived: ((call: Call) => void) | null = null;
  private onCallEnded: ((callId: string) => void) | null = null;

  getCapabilities(): import('../interfaces/telephony-capabilities.interface').TelephonyCapabilities {
    return {
      supportsSupervisorInjection: true,
      supportsParticipantMute: true,
      supportsParticipantHold: true,
      supportsBridgeCall: true,
      supportsTransfer: true
    };
  }

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || process.env.TWILIO_ACCOUNT_SID;
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || process.env.TWILIO_AUTH_TOKEN;
    
    // Previous behavior threw an error and prevented the app from starting when Twilio credentials
    // were not set. For local/dev runs we prefer the app to start and only disable Twilio calls.
    // if (!accountSid || !authToken) {
    //   throw new Error('Twilio credentials not configured');
    // }
    
    // Only initialize the Twilio client when credentials look valid. This avoids
    // instantiating the client during unit tests or when env vars contain placeholder
    // values that would cause the Twilio SDK to throw (e.g., accountSid not starting with 'AC').
    if (!accountSid || !authToken || !accountSid.startsWith?.('AC')) {
      console.warn('Twilio credentials not configured or invalid — TwilioAdapter will operate in "dry" mode.');
      this.client = null as any;
      return;
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
    if (!this.client) {
      console.warn('Twilio client not configured — createCall will no-op and return undefined.');
      return undefined;
    }

    try {
      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }

      // This TwiML instructs Twilio to dial the recipient and place them in a conference
      // named after our internal call ID (which should be the Twilio Call SID).
      const twiml = `<Response><Dial><Conference>${call.id}</Conference></Dial></Response>`;

      const backendUrl = this.configService.get<string>('BACKEND_URL');
      const statusCallback = backendUrl ? `${backendUrl}/webhooks/twilio/voice` : undefined;

      const created = await this.client.calls.create({
        to: call.to,
        from: fromNumber,
        twiml: twiml,
        statusCallback: statusCallback,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      console.log(`Outbound call initiated to ${call.to} and placed in conference ${call.id} — Twilio SID: ${created.sid}`);
      return created.sid;
    } catch (error) {
      console.error('Failed to create call with Twilio:', error);
    }
  }

  async bridgeCall(callId: string, agentId: string): Promise<void> {
    if (!this.client) {
      console.warn('Twilio client not configured — bridgeCall will no-op.');
      return;
    }

    // Conference name derived from call SID to keep it unique and traceable.
    const conferenceName = `conf_${callId}`;

    try {
      this.logger?.log?.(`Bridging call ${callId} into conference ${conferenceName} for agent ${agentId}`);

      // 1) Redirect the existing call (callId) into the conference by updating its TwiML.
      //    This causes the current participant to join the conference.
      const confTwiml = `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`;
      await this.client.calls(callId).update({ twiml: confTwiml });

      // 2) Create an outbound call to the agent and have it join the same conference.
      //    If agentId looks like a phone (starts with +), call the phone number.
      //    Otherwise, assume it's a Twilio Client identifier (softphone) and dial `client:agentId`.
      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }
      const toTarget = agentId && agentId.startsWith('+') ? agentId : `client:${agentId}`;

      const agentCall = await this.client.calls.create({
        to: toTarget,
        from: fromNumber as string,
        twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`,
      });

      this.logger?.log?.(`Agent call created (SID: ${agentCall?.sid}) and joining conference ${conferenceName}`);
    } catch (error) {
      this.logger?.error?.(`Failed to bridge call ${callId} to agent ${agentId}: ${error?.message || error}`);
      // Re-throw to let callers decide how to handle (CallService will propagate or log)
      throw error;
    }

    /*
      NOTE: Previous placeholder implementation:
      // For MVP, simulate bridging by updating call status
      // In full implementation, use Twilio conferences or transfers
      console.log(`Bridging call ${callId} to agent ${agentId}`);
      // Placeholder: Implement via Twilio API if needed
    */
  }
  
  /**
   * Generates a unique participant ID for tracking
   */
  private generateParticipantId(): string {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async injectSupervisor(callId: string, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant | void> {
    if (!this.client) {
      console.warn('Twilio client not configured — injectSupervisor will no-op.');
      return undefined;
    }

    const conferenceName = `conf_${callId}`;
    try {
      this.logger?.log?.(`Injecting supervisor ${supervisorId} into conference ${conferenceName}`);

      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }

      const toTarget = supervisorId && supervisorId.startsWith('+') ? supervisorId : `client:${supervisorId}`;

      // Create a participant in the conference for the supervisor. We mute the supervisor by default
      // so they can listen (whisper/barge-in flows can unmute later).
      const participant = await this.client.conferences(conferenceName).participants.create({
        from: fromNumber,
        to: toTarget,
        muted: options?.initialMuteState !== false, // Default to muted (whisper mode)
        startConferenceOnEnter: true,
      });

      // Twilio's participant resource may expose different fields depending on the SDK version.
      const participantSid = (participant as any).callSid || (participant as any).sid || (participant as any).participantSid;
      
      // Create a CallParticipant object to return
      const callParticipant: CallParticipant = {
        id: this.generateParticipantId(),
        callId,
        participantId: supervisorId,
        participantType: 'supervisor',
        providerCallSid: participantSid,
        providerSpecificData: {
          conferenceName,
          twilioParticipantSid: participantSid
        },
        isMuted: options?.initialMuteState !== false, // Default to muted (whisper mode)
        isOnHold: false,
        joinedAt: new Date()
      };
      
      this.logger?.log?.(`Supervisor injected with participant SID ${participantSid}`);
      return callParticipant;
    } catch (error) {
      this.logger?.error?.(`Failed to inject supervisor into call ${callId}: ${error?.message || error}`);
      throw error;
    }
  }

  async setParticipantMuted(participantId: string, muted: boolean): Promise<void> {
    if (!this.client) {
      console.warn('Twilio client not configured — setParticipantMuted will no-op.');
      return;
    }

    try {
      this.logger?.log?.(`Setting participant ${participantId} muted=${muted}`);
      
      // For Twilio, we need to extract the conference name and participant SID from the participantId
      // In a real implementation, we would look up the participant in our database to get this info
      // For now, we'll assume the participantId is in the format "conferenceName:participantSid"
      const [conferenceName, participantSid] = participantId.split(':');
      
      if (conferenceName && participantSid) {
        await this.client.conferences(conferenceName).participants(participantSid).update({ muted });
        this.logger?.log?.(`Participant ${participantSid} updated (muted=${muted})`);
      } else {
        throw new Error(`Invalid participantId format: ${participantId}. Expected format: conferenceName:participantSid`);
      }
    } catch (error) {
      this.logger?.error?.(`Failed to update participant ${participantId}: ${error?.message || error}`);
      throw error;
    }
  }
  
  async setParticipantOnHold(participantId: string, onHold: boolean): Promise<void> {
    if (!this.client) {
      console.warn('Twilio client not configured — setParticipantOnHold will no-op.');
      return;
    }

    try {
      this.logger?.log?.(`Setting participant ${participantId} onHold=${onHold}`);
      
      // For Twilio, we need to extract the conference name and participant SID from the participantId
      const [conferenceName, participantSid] = participantId.split(':');
      
      if (conferenceName && participantSid) {
        await this.client.conferences(conferenceName).participants(participantSid).update({ hold: onHold });
        this.logger?.log?.(`Participant ${participantSid} updated (onHold=${onHold})`);
      } else {
        throw new Error(`Invalid participantId format: ${participantId}. Expected format: conferenceName:participantSid`);
      }
    } catch (error) {
      this.logger?.error?.(`Failed to update participant ${participantId}: ${error?.message || error}`);
      throw error;
    }
  }

  async endCall(callId: string): Promise<void> {
    if (!this.client) {
      console.warn('Twilio client not configured — endCall will no-op.');
      return;
    }

    try {
      await this.client.calls(callId).update({ status: 'completed' });
      console.log(`Call ${callId} ended`);
    } catch (error) {
      console.error('Failed to end call with Twilio:', error);
    }
  }

  async findQueueByName(queueName: string): Promise<any> {
    if (!this.client) {
      console.warn('Twilio client not configured — findQueueByName will return undefined.');
      return undefined;
    }

    const queues = await this.client.queues.list();
    return queues.find((q: any) => q.friendlyName === queueName);
  }

  async getFirstCallFromQueue(queueSid: string): Promise<any> {
    if (!this.client) {
      console.warn('Twilio client not configured — getFirstCallFromQueue will return undefined.');
      return undefined;
    }

    const members = await this.client.queues(queueSid).members.list({ limit: 1 });
    return members.length > 0 ? members[0] : undefined;
  }

  async redirectCall(callSid: string, twiml: string): Promise<void> {
    if (!this.client) {
      console.warn('Twilio client not configured — redirectCall will no-op.');
      return;
    }

    try {
      await this.client.calls(callSid).update({ twiml });
      console.log(`Redirected call ${callSid}`);
    } catch (error) {
      console.error(`Failed to redirect call ${callSid}:`, error);
    }
  }
}