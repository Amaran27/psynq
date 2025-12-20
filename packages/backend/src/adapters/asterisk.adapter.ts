import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
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
import { EventBusPort } from '../ports/event-bus.port';

@Injectable()
export class AsteriskAdapter implements TelephonyPort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsteriskAdapter.name);
  private clients: Map<string, ari.Client> = new Map();
  private callReceivedCallback: ((call: Call) => void) | null = null;
  private callEndedCallback: ((callId: string) => void) | null = null;
  private participantJoinedCallback: ((participant: CallParticipant) => void) | null = null;
  private recordings: Map<string, ari.LiveRecording> = new Map();

  constructor(
    private readonly storageService: StorageService,
    private readonly settingsService: SettingsService,
    @Inject('EVENT_BUS') private readonly eventBus: EventBusPort,
  ) {}

  async onModuleInit() {
    this.logger.log('AsteriskAdapter initialized in multi-tenant mode.');
  }

  async onModuleDestroy() {
    for (const [key, client] of this.clients) {
      this.logger.log(`Closing Asterisk connection for: ${key}`);
    }
  }

  private async getClient(orgId: string | null): Promise<ari.Client> {
    const key = orgId || 'system-default';
    if (this.clients.has(key)) {
      return this.clients.get(key)!;
    }

    try {
      const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config', true);
      if (!config) {
        throw new ConfigurationMissingError('telephony.asterisk.config', orgId);
      }

      const ariUrl = config.url || 'http://127.0.0.1:8088';
      const ariUser = config.username || 'psynq';
      const ariPass = config.password || 'asterisk';
      
      const client = await ari.connect(ariUrl, ariUser, ariPass);
      
      client.on('StasisStart', (event, channel) => this.handleIncomingCall(orgId, channel));
      client.on('ChannelHangup', (event, channel) => this.handleCallHangup(orgId, channel));
      client.on('ChannelDtmfReceived', (event, channel) => {
        this.eventBus.publish({
          type: 'telephony.dtmf_received',
          organizationId: orgId || 'system',
          payload: { callId: channel.id, digit: event.digit },
          timestamp: new Date()
        });
      });
      
      client.on('ChannelEnteredBridge', (event, { bridge, channel }) => {
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

      client.start(config.app || 'psynq-app');
      this.clients.set(key, client);
      this.logger.log(`Connected to Asterisk ARI for org: ${key}`);
      return client;
    } catch (e) {
      this.logger.error(`Failed to connect to Asterisk for org ${orgId || 'system'}: ${e.message}`);
      throw new TelephonyProviderError(`Asterisk connection failed for ${key}`, 'asterisk', e);
    }
  }

  async generateToken(orgId: string | null, agentId: string): Promise<any> {
    const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config', true);
    
    return {
      provider: 'asterisk',
      server: config?.webrtc_uri || process.env.ASTERISK_WEBRTC_URI || `wss://asterisk.psynq.com:8089/ws`,
      user: agentId,
      sip_uri: `sip:${agentId}@${config?.domain || 'asterisk.psynq.com'}`,
      password: config?.password || 'agent-password',
    };
  }

  async healthCheck(orgId: string | null): Promise<boolean> {
    try {
      const client = await this.getClient(orgId);
      const channels = await client.channels.list();
      return Array.isArray(channels);
    } catch (err) {
      return false;
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

  private async handleIncomingCall(orgId: string | null, channel: any) {
    const role = channel.variables?.ROLE || 'customer';
    const callId = channel.variables?.CALL_ID || channel.id;
    const bridgeId = channel.variables?.BRIDGE_ID;

    await this.eventBus.publish({
      type: 'telephony.channel_entered',
      organizationId: orgId || 'system',
      payload: {
        channelId: channel.id,
        callId,
        role,
        bridgeId,
        callerNumber: channel.caller?.number,
        destination: channel.variables?.DESTINATION
      },
      timestamp: new Date()
    });

    if (!channel.variables?.CALL_ID && role === 'customer') {
      const call = new Call(callId, channel.caller.number || 'Unknown', channel.dialplan.exten || 'Unknown');
      (call as any).organizationId = orgId;
      call.externalId = channel.id;
      call.state = CallState.RINGING;

      await this.eventBus.publish({
        type: 'telephony.call_received',
        organizationId: orgId || 'system',
        payload: call,
        timestamp: new Date()
      });
    }
  }

  private async handleCallHangup(orgId: string | null, channel: any) {
    const callId = channel.variables?.CALL_ID;
    const bridgeId = channel.variables?.BRIDGE_ID;

    if (bridgeId) {
      await this.stopBridgeRecording(orgId, bridgeId, callId);
    }

    await this.eventBus.publish({
      type: 'telephony.channel_hungup',
      organizationId: orgId || 'system',
      payload: { channelId: channel.id, callId, bridgeId },
      timestamp: new Date()
    });

    await this.eventBus.publish({
      type: 'telephony.call_ended',
      organizationId: orgId || 'system',
      payload: { callId: channel.id },
      timestamp: new Date()
    });
  }

  async startBridgeRecording(orgId: string | null, bridgeId: string, callId: string): Promise<void> {
    try {
      const client = await this.getClient(orgId);
      const recording = await client.bridges.record({
        bridgeId,
        name: `call-${callId}-${Date.now()}`,
        format: 'wav',
        ifExists: 'overwrite'
      });
      this.recordings.set(bridgeId, recording);
    } catch (e) {
      this.logger.error(`Failed to start bridge recording: ${e.message}`);
    }
  }

  async stopBridgeRecording(orgId: string | null, bridgeId: string, callId: string): Promise<void> {
    const recording = this.recordings.get(bridgeId);
    if (recording) {
      try {
        const client = await this.getClient(orgId);
        await client.recordings.stop({ recordingName: recording.name });
        const stream = await client.recordings.getStoredFile({ recordingName: recording.name });
        await this.storageService.uploadRecording(callId || bridgeId, stream, 'audio/wav', orgId);
        await client.recordings.deleteStored({ recordingName: recording.name });
        this.recordings.delete(bridgeId);
      } catch (e) {
        this.logger.error(`Failed to stop/upload bridge recording: ${e.message}`);
      }
    }
  }

  async createCall(call: Call): Promise<string | void> {
    const orgId = (call as any).organizationId || null;
    const client = await this.getClient(orgId);
    
    try {
      const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config', true);
      const bridgeId = `bridge-${call.id}`;
      await client.bridges.create({ type: 'mixing', bridgeId });

      const agentEndpoint = `PJSIP/${call.agentId || 'unknown'}`;
      const channel = await client.channels.originate({
        endpoint: agentEndpoint,
        app: config?.app || 'psynq-app',
        variables: { 
          CALL_ID: call.id, 
          BRIDGE_ID: bridgeId, 
          ROLE: 'agent',
          DESTINATION: call.to
        }
      });

      return channel.id;
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new TelephonyProviderError(`Failed to initiate calling machine: ${error.message}`, 'asterisk', error);
    }
  }

  async dialLegB(orgId: string | null, callId: string, bridgeId: string, destination: string): Promise<void> {
    const client = await this.getClient(orgId);
    const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config');
    await client.channels.originate({
      endpoint: config?.endpoint || 'PJSIP/main-trunk',
      extension: destination,
      app: config?.app || 'psynq-app',
      variables: { CALL_ID: callId, BRIDGE_ID: bridgeId, ROLE: 'customer' }
    });
  }

  async joinBridge(orgId: string | null, bridgeId: string, channelId: string): Promise<void> {
    const client = await this.getClient(orgId);
    const bridge = await client.bridges.get({ bridgeId });
    await bridge.addChannel({ channel: channelId });
  }

  async playAudio(orgId: string | null, callId: string, url: string): Promise<void> {
    const client = await this.getClient(orgId);
    try {
      await client.channels.play({ channelId: callId, media: `sound:${url}` });
    } catch (e) {
      this.logger.error(`Failed to play audio on ${callId}: ${e.message}`);
    }
  }

  async sayText(orgId: string | null, callId: string, text: string): Promise<void> {
    const client = await this.getClient(orgId);
    try {
      // Assuming a TTS engine like Flite or Google is configured in Asterisk
      await client.channels.play({ channelId: callId, media: `tts:${text}` });
    } catch (e) {
      this.logger.error(`Failed to say text on ${callId}: ${e.message}`);
    }
  }

  async gatherDigits(orgId: string | null, callId: string, options: { maxDigits: number, timeout: number, finishOnKey: string }): Promise<void> {
    // In ARI, digits are received as events. We just need to ensure the channel is in Stasis.
    this.logger.debug(`Listening for digits on channel ${callId}. Max: ${options.maxDigits}`);
  }

  async forkAudio(orgId: string | null, callId: string, destination: string): Promise<void> {
    const client = await this.getClient(orgId);
    try {
      // Create a snoop channel that forks the audio to an external RTP destination
      // destination should be in format 'host:port'
      await client.channels.snoopChannel({
        channelId: callId,
        spy: 'both',
        app: 'psynq-app',
        appArgs: `fork:${destination}`
      });
      this.logger.log(`Forked audio for channel ${callId} to ${destination}`);
    } catch (e) {
      this.logger.error(`Failed to fork audio for ${callId}: ${e.message}`);
    }
  }

  async bridgeParticipants(call: Call, targetIdentifier: string, options?: BridgeOptions): Promise<CallParticipant | void> {
    const orgId = (call as any).organizationId || null;
    const callId = call.externalId || call.id;
    const client = await this.getClient(orgId);
    
    try {
      const bridgeId = `bridge-${call.id}`;
      let bridge;
      try { bridge = await client.bridges.get({ bridgeId }); } 
      catch (e) { bridge = await client.bridges.create({ type: 'mixing', bridgeId, name: bridgeId }); }

      await bridge.addChannel({ channel: callId });

      const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config');
      const targetChannel = await client.channels.originate({
          endpoint: `PJSIP/${targetIdentifier}`,
          app: config?.app || 'psynq-app',
          variables: { CALL_ID: call.id, BRIDGE_ID: bridgeId }
      });
      
      await bridge.addChannel({ channel: targetChannel.id });

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
    const client = await this.getClient(orgId);

    try {
        if (options?.mode === 'whisper') {
            const bridgeId = `bridge-${call.id}`;
            const bridge = await client.bridges.get({ bridgeId });
            const agentChannelId = bridge.channels.find(id => id !== callId);
            
            if (agentChannelId) {
                const snoopChannel = await client.channels.snoopChannel({
                    channelId: agentChannelId,
                    app: 'psynq-app',
                    spy: 'both',
                    whisper: 'out',
                    appArgs: 'snooping'
                });
                
                const config = await this.settingsService.getSetting(orgId, 'telephony.asterisk.config');
                const supervisorChannel = await client.channels.originate({
                    endpoint: `PJSIP/${supervisorId}`,
                    app: config?.app || 'psynq-app',
                });
                
                const snoopBridge = await client.bridges.create({ type: 'mixing', name: `snoop-${call.id}` });
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
    const client = await this.getClient(orgId);
    try {
      const channelId = participantId.includes(':') ? participantId.split(':')[1] : participantId;
      if (muted) await client.channels.startMoh({ channelId, musicClass: 'silence' });
      else await client.channels.stopMoh({ channelId });
    } catch (error) {
      throw new TelephonyProviderError(`Failed to set participant mute state: ${error.message}`, 'asterisk', error);
    }
  }

  async setParticipantOnHold(orgId: string | null, participantId: string, onHold: boolean): Promise<void> {
    const client = await this.getClient(orgId);
    try {
      const channelId = participantId.includes(':') ? participantId.split(':')[1] : participantId;
      if (onHold) await client.channels.startMoh({ channelId });
      else await client.channels.stopMoh({ channelId });
    } catch (error) {
      throw new TelephonyProviderError(`Failed to set participant hold state: ${error.message}`, 'asterisk', error);
    }
  }

  async endCall(call: Call): Promise<void> {
    const orgId = (call as any).organizationId || null;
    const callId = call.externalId || call.id;
    const client = await this.getClient(orgId);
    try {
      const snoopBridgeId = `snoop-${call.id}`;
      try { await client.bridges.destroy({ bridgeId: snoopBridgeId }); } catch (e) {}
      await client.channels.hangup({ channelId: callId });
    } catch (error) {
      this.logger.error(`Failed to hangup call: ${error.message}`);
    }
  }

  async getRecording(callId: string): Promise<Readable | null> {
    return null;
  }

  onCallReceived(callback: (call: Call) => void): void { this.callReceivedCallback = callback; }
  onCallEnded(callback: (callId: string) => void): void { this.callEndedCallback = callback; }
  onParticipantJoined(callback: (participant: CallParticipant) => void): void { this.participantJoinedCallback = callback; }
}
