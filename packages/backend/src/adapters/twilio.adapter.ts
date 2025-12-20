import { Injectable, Logger } from '@nestjs/common';
import { TelephonyPort } from '../ports/telephony.port';
import { Call } from '@psynq/core';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import { BridgeOptions } from '../interfaces/bridge-options.interface';
import twilio from 'twilio';
import { createStandardParticipantId } from '../utils/participant-id.util';
import { SettingsService } from '../services/settings.service';
import { TelephonyCapabilities } from '../interfaces/telephony-capabilities.interface';
import { Readable } from 'stream';
import { PsynqException, TelephonyProviderError, ConfigurationMissingError } from '../common/exceptions/psynq.exception';

@Injectable()
export class TwilioAdapter implements TelephonyPort {
  private readonly logger = new Logger(TwilioAdapter.name);
  private callReceivedCallback: ((call: Call) => void) | null = null;
  private callEndedCallback: ((callId: string) => void) | null = null;
  private participantJoinedCallback: ((participant: CallParticipant) => void) | null = null;

  constructor(private readonly settingsService: SettingsService) {}

  private async getClient(orgId: string | null): Promise<{ client: twilio.Twilio, config: any }> {
    const config = await this.settingsService.getSetting(orgId, 'telephony.twilio.config', true);
    if (!config || !config.accountSid || !config.authToken) {
      throw new ConfigurationMissingError('telephony.twilio.config', orgId);
    }
    try {
      return {
        client: twilio(config.accountSid, config.authToken),
        config
      };
    } catch (error) {
      throw new TelephonyProviderError('Failed to initialize Twilio client', 'twilio', error);
    }
  }

  getCapabilities(): TelephonyCapabilities {
    return {
      supportsSupervisorInjection: true,
      supportsParticipantMute: true,
      supportsParticipantHold: true,
      supportsBridgeCall: true,
      supportsTransfer: true,
      supportsBarge: true,
      supportsWhisper: true
    };
  }

  async createCall(call: Call): Promise<string | undefined> {
    const orgId = (call as any).organizationId || null;
    try {
      const { client, config } = await this.getClient(orgId);
      const fromNumber = config.phoneNumber;
      if (!fromNumber) {
        throw new ConfigurationMissingError('telephony.twilio.config.phoneNumber', orgId);
      }

      const twiml = `<Response><Dial><Conference>${call.id}</Conference></Dial></Response>`;
      const backendUrl = config.backendUrl;
      const statusCallback = backendUrl ? `${backendUrl}/webhooks/twilio/voice` : undefined;

      const created = await client.calls.create({
        to: call.to,
        from: fromNumber,
        twiml: twiml,
        statusCallback: statusCallback,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      this.logger.log(`Outbound call initiated to ${call.to} — Twilio SID: ${created.sid}`);
      return created.sid;
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new TelephonyProviderError(`Failed to create call: ${error.message}`, 'twilio', error);
    }
  }

  async bridgeParticipants(call: Call, targetIdentifier: string, options?: BridgeOptions): Promise<CallParticipant | void> {
    const orgId = (call as any).organizationId || null;
    const callId = call.externalId || call.id;
    const conferenceName = `conf_${callId}`;

    try {
      const { client, config } = await this.getClient(orgId);
      this.logger.log(`Bridging call ${callId} into conference ${conferenceName} for target ${targetIdentifier}`);

      const confTwiml = `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`;
      await client.calls(callId).update({ twiml: confTwiml });

      const fromNumber = config.phoneNumber;
      const toTarget = targetIdentifier && targetIdentifier.startsWith('+') ? targetIdentifier : `client:${targetIdentifier}`;

      const targetCall = await client.calls.create({
        to: toTarget,
        from: fromNumber,
        twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`,
      });

      const participantSid = targetCall.sid;
      const standardParticipantId = createStandardParticipantId('twilio', call.id, participantSid, { conferenceName, twilioParticipantSid: participantSid });

      const participant = {
        id: standardParticipantId,
        callId: call.id,
        participantId: targetIdentifier,
        participantType: 'agent' as const,
        providerCallSid: participantSid,
        providerSpecificData: { conferenceName, twilioParticipantSid: participantSid, standardParticipantId },
        isMuted: false,
        isOnHold: false,
        joinedAt: new Date()
      };

      if (this.participantJoinedCallback) {
        this.participantJoinedCallback(participant);
      }

      return participant;
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new TelephonyProviderError(`Failed to bridge participants: ${error.message}`, 'twilio', error);
    }
  }

  async injectSupervisor(call: Call, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant | void> {
    const orgId = (call as any).organizationId || null;
    const callId = call.externalId || call.id;
    const conferenceName = `conf_${callId}`;

    try {
      const { client, config } = await this.getClient(orgId);
      this.logger.log(`Injecting supervisor ${supervisorId} into conference ${conferenceName}`);

      const fromNumber = config.phoneNumber;
      const toTarget = supervisorId && supervisorId.startsWith('+') ? supervisorId : `client:${supervisorId}`;
      const shouldMute = options?.mode === 'whisper' || options?.mode === 'monitor' || options?.initialMuteState === true;

      const participantRaw = await client.conferences(conferenceName).participants.create({
        from: fromNumber,
        to: toTarget,
        muted: shouldMute,
        startConferenceOnEnter: true,
      });

      const participantSid = (participantRaw as any).callSid || (participantRaw as any).sid || (participantRaw as any).participantSid;
      const standardParticipantId = createStandardParticipantId('twilio', callId, participantSid, { conferenceName, twilioParticipantSid: participantSid });

      const participant = {
        id: standardParticipantId,
        callId: call.id,
        participantId: supervisorId,
        participantType: 'supervisor' as const,
        providerCallSid: participantSid,
        providerSpecificData: { conferenceName, twilioParticipantSid: participantSid, standardParticipantId },
        isMuted: shouldMute,
        isOnHold: false,
        joinedAt: new Date()
      };

      if (this.participantJoinedCallback) {
        this.participantJoinedCallback(participant);
      }

      return participant;
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new TelephonyProviderError(`Failed to inject supervisor: ${error.message}`, 'twilio', error);
    }
  }

  async setParticipantMuted(orgId: string | null, participantId: string, muted: boolean): Promise<void> {
    try {
      const { client } = await this.getClient(orgId);
      const [conferenceName, participantSid] = participantId.split(':');
      if (conferenceName && participantSid) {
        await client.conferences(conferenceName).participants(participantSid).update({ muted });
      }
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new TelephonyProviderError(`Failed to update participant mute state: ${error.message}`, 'twilio', error);
    }
  }

  async setParticipantOnHold(orgId: string | null, participantId: string, onHold: boolean): Promise<void> {
    try {
      const { client } = await this.getClient(orgId);
      const [conferenceName, participantSid] = participantId.split(':');
      if (conferenceName && participantSid) {
        await client.conferences(conferenceName).participants(participantSid).update({ hold: onHold });
      }
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new TelephonyProviderError(`Failed to update participant hold state: ${error.message}`, 'twilio', error);
    }
  }

  async endCall(call: Call): Promise<void> {
    const orgId = (call as any).organizationId || null;
    const callId = call.externalId || call.id;
    try {
      const { client } = await this.getClient(orgId);
      await client.calls(callId).update({ status: 'completed' });
    } catch (error) {
      this.logger.error(`Failed to end call with Twilio: ${error.message}`);
    }
  }

  async findQueueByName(queueName: string): Promise<any | null> {
    try {
      const { client } = await this.getClient(null);
      const queues = await client.queues.list();
      return queues.find((q: any) => q.friendlyName === queueName) || null;
    } catch (error) {
      return null;
    }
  }

  async getFirstCallFromQueue(queueSid: string): Promise<any | null> {
    try {
      const { client } = await this.getClient(null);
      const members = await client.queues(queueSid).members.list({ limit: 1 });
      return members.length > 0 ? members[0] : null;
    } catch (error) {
      return null;
    }
  }

  async redirectCall(call: Call, target: string): Promise<void> {
    const orgId = (call as any).organizationId || null;
    const callSid = call.externalId || call.id;
    try {
      const { client } = await this.getClient(orgId);
      await client.calls(callSid).update({ twiml: target });
    } catch (error) {
      throw new TelephonyProviderError(`Failed to redirect call: ${error.message}`, 'twilio', error);
    }
  }

  onCallReceived(callback: (call: Call) => void): void { this.callReceivedCallback = callback; }
  onCallEnded(callback: (callId: string) => void): void { this.callEndedCallback = callback; }
  onParticipantJoined(callback: (participant: CallParticipant) => void): void { this.participantJoinedCallback = callback; }

  async getRecording(callId: string): Promise<Readable | null> {
    return null;
  }
}
