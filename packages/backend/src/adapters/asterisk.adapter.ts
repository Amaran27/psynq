import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { TelephonyPort } from '../ports/telephony.port';
import { Call, CallState } from '@psynq/core';
import { TelephonyCapabilities } from '../interfaces/telephony-capabilities.interface';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import { BridgeOptions } from '../interfaces/bridge-options.interface';
import * as ari from 'ari-client';
import { StorageService } from '../modules/storage/storage.service';
import { createStandardParticipantId } from '../utils/participant-id.util';
import { SettingsService } from '../services/settings.service';
import { Readable } from 'stream';
import { PsynqException, TelephonyProviderError, ConfigurationMissingError } from '../common/exceptions/psynq.exception';

@Injectable()
export class AsteriskAdapter implements TelephonyPort, OnModuleInit {
  private readonly logger = new Logger(AsteriskAdapter.name);
  private client: ari.Client | null = null;
  private callReceivedCallback: ((call: Call) => void) | null = null;
  private callEndedCallback: ((callId: string) => void) | null = null;
  private participantJoinedCallback: ((participant: CallParticipant) => void) | null = null;
  private recordings: Map<string, ari.StoredRecording> = new Map();
  private channelOrgMap: Map<string, string> = new Map();

  constructor(
    private readonly storageService: StorageService,
    private readonly settingsService: SettingsService
  ) {}

  async onModuleInit() {
    this.connectToAsterisk(null).catch(error => {
      this.logger.error('Failed to connect to system-default Asterisk ARI:', error);
    });
  }

  async healthCheck(orgId: string | null): Promise<boolean> {
    if (!this.client) return false;
    try {
      const channels = await this.client.channels.list();
      return Array.isArray(channels);
    } catch (err) {
      return false;
    }
  }

  private async connectToAsterisk(orgId: string | null) {
    try {
      const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config', true);
      if (!config) return;

      const ariUrl = config.url || 'http://127.0.0.1:8088';
      const ariUser = config.username || 'psynq';
      const ariPass = config.password || 'asterisk';
      
      this.client = await ari.connect(ariUrl, ariUser, ariPass);
      this.client.on('StasisStart', (event, channel) => this.handleIncomingCall(channel));
      this.client.on('ChannelHangup', (event, channel) => this.handleCallHangup(channel));
      
      this.client.on('ChannelEnteredBridge', (event, { bridge, channel }) => {
          if (this.participantJoinedCallback) {
              const callId = channel.variables?.CALL_ID || bridge.id.replace('bridge-', '');
              const participantId = channel.caller?.number || channel.id;
              const standardParticipantId = createStandardParticipantId('asterisk', callId, channel.id);

              this.participantJoinedCallback({
                  id: standardParticipantId,
                  callId: callId,
                  participantId: participantId,
                  participantType: 'agent' as const,
                  providerCallSid: channel.id,
                  isMuted: false,
                  isOnHold: false,
                  joinedAt: new Date()
              });
          }
      });

      this.client.start(config.app || 'psynq-app');
      this.logger.log(`Connected to Asterisk ARI at ${ariUrl} for org ${orgId || 'system'}`);
    } catch (e) {
        this.logger.warn(`Failed to connect to Asterisk for org ${orgId || 'system'}: ${e.message}`);
    }
  }

  getCapabilities(): TelephonyCapabilities {
    return {
      supportsSupervisorInjection: true,
      supportsParticipantMute: true,
      supportsParticipantHold: true,
      supportsBridgeCall: true,
      supportsTransfer: false,
      supportsBarge: true,
      supportsWhisper: true
    };
  }

  private handleIncomingCall(channel: any) {
    if (this.callReceivedCallback) {
      const callId = channel.variables?.CALL_ID || channel.id;
      const call = new Call(
        callId,
        channel.caller.number || 'Unknown',
        channel.dialplan.exten || 'Unknown'
      );
      call.externalId = channel.id;
      call.state = CallState.RINGING;
      this.callReceivedCallback(call);
    }
    this.startRecording(channel.id);
  }

  private async startRecording(channelId: string) {
    if (this.client) {
      try {
        const recording = await this.client.channels.record({
          channelId,
          name: `recording-${channelId}`,
          format: 'wav',
          ifExists: 'overwrite'
        });
        this.recordings.set(channelId, recording);
      } catch (error) {
        this.logger.error('Failed to start recording:', error);
      }
    }
  }

  private handleCallHangup(channel: any) {
    this.stopRecording(channel.id);
    if (this.callEndedCallback) {
      this.callEndedCallback(channel.id);
    }
  }

  private async stopRecording(channelId: string) {
    const recording = this.recordings.get(channelId);
    const orgId = this.channelOrgMap.get(channelId) || null;
    if (recording && this.client) {
      try {
        await this.client.recordings.stop({ recordingName: recording.name });
        const stream = await this.client.recordings.getStoredFile({ recordingName: recording.name });
        await this.storageService.uploadRecording(channelId, stream, 'audio/wav', orgId);
        await this.client.recordings.deleteStored({ recordingName: recording.name });
        this.recordings.delete(channelId);
        this.channelOrgMap.delete(channelId);
      } catch (error) {
        this.logger.error(`Failed to stop/upload recording: ${error.message}`);
      }
    }
  }

  async createCall(call: Call): Promise<string | void> {
    const orgId = (call as any).organizationId || null;
    if (!this.client) throw new TelephonyProviderError('Asterisk client not connected', 'asterisk');
    try {
      const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config', true);
      if (!config) throw new ConfigurationMissingError('telephony.asterisk.config', orgId);

      const channel = await this.client.channels.originate({
        endpoint: config.endpoint || 'PJSIP/twilio-trunk',
        extension: call.to,
        context: config.context || 'outbound',
        callerId: call.from,
        variables: { CALL_ID: call.id }
      });
      this.channelOrgMap.set(channel.id, orgId);
      return channel.id;
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new TelephonyProviderError(`Failed to originate call: ${error.message}`, 'asterisk', error);
    }
  }

  async bridgeParticipants(call: Call, targetIdentifier: string, options?: BridgeOptions): Promise<CallParticipant | void> {
    const orgId = (call as any).organizationId || null;
    const callId = call.externalId || call.id;
    if (!this.client) throw new TelephonyProviderError('Asterisk client not connected', 'asterisk');
    try {
      const bridgeId = `bridge-${call.id}`;
      let bridge;
      try { bridge = await this.client.bridges.get({ bridgeId }); } 
      catch (e) { bridge = await this.client.bridges.create({ type: 'mixing', bridgeId, name: bridgeId }); }

      await bridge.addChannel({ channel: callId });

      const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config');
      const targetChannel = await this.client.channels.originate({
          endpoint: `PJSIP/${targetIdentifier}`,
          app: config?.app || 'psynq-app',
          variables: { CALL_ID: call.id, BRIDGE_ID: bridgeId }
      });
      
      await bridge.addChannel({ channel: targetChannel.id });
      this.channelOrgMap.set(targetChannel.id, orgId);

      const channelSid = targetChannel.id;
      const standardParticipantId = createStandardParticipantId('asterisk', call.id, channelSid);
      
      return {
        id: standardParticipantId,
        callId: call.id,
        participantId: targetIdentifier,
        participantType: 'agent' as const,
        providerCallSid: channelSid,
        providerSpecificData: { standardParticipantId, channelSid, bridgeId },
        isMuted: false,
        isOnHold: false,
        joinedAt: new Date()
      };
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new TelephonyProviderError(`Failed to bridge participants: ${error.message}`, 'asterisk', error);
    }
  }

  async injectSupervisor(call: Call, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant | void> {
    const callId = call.externalId || call.id;
    const orgId = (call as any).organizationId || null;
    
    if (!this.client) throw new TelephonyProviderError('Asterisk client not connected', 'asterisk');
    try {
        if (options?.mode === 'whisper') {
            const bridgeId = `bridge-${call.id}`;
            const bridge = await this.client.bridges.get({ bridgeId });
            const agentChannelId = bridge.channels.find(id => id !== callId);
            
            if (agentChannelId) {
                const snoopChannel = await this.client.channels.snoopChannel({
                    channelId: agentChannelId,
                    app: 'psynq-app',
                    spy: 'both',
                    whisper: 'out',
                    appArgs: 'snooping'
                });
                
                const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config');
                const supervisorChannel = await this.client.channels.originate({
                    endpoint: `PJSIP/${supervisorId}`,
                    app: config?.app || 'psynq-app',
                });
                
                const snoopBridge = await this.client.bridges.create({ type: 'mixing', name: `snoop-${call.id}` });
                await snoopBridge.addChannel({ channel: [supervisorChannel.id, snoopChannel.id] });
                
                const standardParticipantId = createStandardParticipantId('asterisk', call.id, supervisorChannel.id);
                return {
                    id: standardParticipantId,
                    callId: call.id,
                    participantId: supervisorId,
                    participantType: 'supervisor' as const,
                    providerCallSid: supervisorChannel.id,
                    providerSpecificData: { snoopChannelId: snoopChannel.id, snoopBridgeId: snoopBridge.id },
                    isMuted: false,
                    isOnHold: false,
                    joinedAt: new Date()
                };
            }
        }
        
        const participant = await this.bridgeParticipants(call, supervisorId, { 
            muted: options?.mode === 'monitor' || options?.initialMuteState,
            metadata: { role: 'supervisor' }
        });
        
        if (participant && (options?.mode === 'monitor' || options?.initialMuteState)) {
            await this.setParticipantMuted(orgId, participant.id, true);
            participant.isMuted = true;
        }
        return participant;
    } catch (error) {
        if (error instanceof PsynqException) throw error;
        throw new TelephonyProviderError(`Failed to inject supervisor: ${error.message}`, 'asterisk', error);
    }
  }

  async setParticipantMuted(orgId: string | null, participantId: string, muted: boolean): Promise<void> {
    if (!this.client) return;
    try {
      const channelId = participantId.startsWith('chan_') ? participantId.substring(5) : participantId;
      if (muted) await this.client.channels.startMoh({ channelId, musicClass: 'silence' });
      else await this.client.channels.stopMoh({ channelId });
    } catch (error) {
      throw new TelephonyProviderError(`Failed to set participant mute state: ${error.message}`, 'asterisk', error);
    }
  }

  async setParticipantOnHold(orgId: string | null, participantId: string, onHold: boolean): Promise<void> {
    if (!this.client) return;
    try {
      const channelId = participantId.startsWith('chan_') ? participantId.substring(5) : participantId;
      if (onHold) await this.client.channels.startMoh({ channelId });
      else await this.client.channels.stopMoh({ channelId });
    } catch (error) {
      throw new TelephonyProviderError(`Failed to set participant hold state: ${error.message}`, 'asterisk', error);
    }
  }

  async endCall(call: Call): Promise<void> {
    const callId = call.externalId || call.id;
    if (this.client) {
      try {
        const snoopBridgeId = `snoop-${call.id}`;
        try { await this.client.bridges.destroy({ bridgeId: snoopBridgeId }); } catch (e) {}
        await this.client.channels.hangup({ channelId: callId });
      } catch (error) {
        this.logger.error(`Failed to hangup call: ${error.message}`);
      }
    }
  }

  async getRecording(callId: string): Promise<Readable | null> {
    return null;
  }

  onCallReceived(callback: (call: Call) => void): void { this.callReceivedCallback = callback; }
  onCallEnded(callback: (callId: string) => void): void { this.callEndedCallback = callback; }
  onParticipantJoined(callback: (participant: CallParticipant) => void): void { this.participantJoinedCallback = callback; }
}
