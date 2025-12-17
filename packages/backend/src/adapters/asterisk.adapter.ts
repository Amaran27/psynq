import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelephonyPort } from '../ports/telephony.port';
import { Call, CallState } from '@psynq/core';
import { TelephonyCapabilities } from '../interfaces/telephony-capabilities.interface';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import * as ari from 'ari-client';
import { StorageService } from '../modules/storage/storage.service';

@Injectable()
export class AsteriskAdapter implements TelephonyPort, OnModuleInit {
  private client: ari.Client | null = null;
  private onCallReceived: ((call: Call) => void) | null = null;
  private onCallEnded: ((callId: string) => void) | null = null;
  private recordings: Map<string, ari.StoredRecording> = new Map();

  constructor(private storageService: StorageService) {}

  async onModuleInit() {
    await this.connectToAsterisk();
  }

  getCapabilities(): TelephonyCapabilities {
    return {
      supportsSupervisorInjection: true,
      supportsParticipantMute: false,
      supportsParticipantHold: false,
      supportsBridgeCall: true,
      supportsTransfer: false
    };
  }

  private async connectToAsterisk() {
    try {
      this.client = await ari.connect('http://localhost:8088', 'asterisk', 'asterisk');
      console.log('Connected to Asterisk ARI');

      // Listen for StasisStart events (incoming calls)
      this.client.on('StasisStart', (event, channel) => {
        this.handleIncomingCall(channel);
      });

      // Listen for ChannelHangup events
      this.client.on('ChannelHangup', (event, channel) => {
        this.handleCallHangup(channel);
      });

      // Start the Stasis application
      this.client.start('psynq-app');
    } catch (error) {
      console.error('Failed to connect to Asterisk ARI:', error);
    }
  }

  private handleIncomingCall(channel: any) {
    if (this.onCallReceived) {
      const call = new Call(
        channel.id,
        channel.caller.number || 'Unknown',
        channel.dialplan.exten || 'Unknown'
      );
      call.state = CallState.RINGING;
      this.onCallReceived(call);
    }
    // Start recording
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
        console.error('Failed to start recording:', error);
      }
    }
  }

  private handleCallHangup(channel: any) {
    // Stop recording and upload
    this.stopRecording(channel.id);
    if (this.onCallEnded) {
      this.onCallEnded(channel.id);
    }
  }

  private async stopRecording(channelId: string) {
    const recording = this.recordings.get(channelId);
    if (recording && this.client) {
      try {
        // Stop the recording
        await this.client.recordings.stop({ recordingName: recording.name });
        // Get the stored recording
        const storedRecording = await this.client.recordings.getStored({ recordingName: recording.name });
        // Download and upload to MinIO
        const stream = await this.client.recordings.getStoredFile({ recordingName: recording.name });
        await this.storageService.uploadRecording(channelId, stream, 'audio/wav');
        // Clean up
        await this.client.recordings.deleteStored({ recordingName: recording.name });
        this.recordings.delete(channelId);
      } catch (error) {
        console.error('Failed to stop/upload recording:', error);
      }
    }
  }

  setCallReceivedCallback(callback: (call: Call) => void) {
    this.onCallReceived = callback;
  }

  setCallEndedCallback(callback: (callId: string) => void) {
    this.onCallEnded = callback;
  }

  async createCall(call: Call): Promise<void> {
    // For outgoing calls, use ARI originate
    if (this.client) {
      try {
        await this.client.channels.originate({
          endpoint: `PJSIP/${call.to}`,
          extension: call.from,
          context: 'default',
          app: 'psynq-app',
          callerId: call.from
        });
      } catch (error) {
        console.error('Failed to originate call:', error);
      }
    }
  }

  async bridgeCall(callId: string, agentId: string): Promise<void> {
    if (this.client) {
      try {
        // Find the channel
        const channel = await this.client.channels.get({ channelId: callId });
        if (channel) {
          // Bridge to agent endpoint
          await this.client.channels.originate({
            endpoint: `PJSIP/${agentId}`,
            app: 'psynq-app',
            originator: callId
          });
        }
      } catch (error) {
        console.error('Failed to bridge call:', error);
      }
    }
  }

  async injectSupervisor(callId: string, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant | void> {
    // Similar to bridge, but for supervisor
    await this.bridgeCall(callId, supervisorId);
    // Return a dummy participant for now as Asterisk implementation is incomplete
    return {
      id: `sup_${Date.now()}`,
      callId,
      participantId: supervisorId,
      participantType: 'supervisor',
      providerCallSid: `chan_${Date.now()}`,
      isMuted: options?.initialMuteState !== false,
      isOnHold: false,
      joinedAt: new Date()
    };
  }

  async setParticipantMuted(participantId: string, muted: boolean): Promise<void> {
    console.warn('setParticipantMuted not implemented for Asterisk');
  }

  async setParticipantOnHold(participantId: string, onHold: boolean): Promise<void> {
    console.warn('setParticipantOnHold not implemented for Asterisk');
  }

  async endCall(callId: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.channels.hangup({ channelId: callId });
      } catch (error) {
        console.error('Failed to hangup call:', error);
      }
    }
  }

  /**
   * Basic health check: returns true if ARI client connected and reachable.
   * For unit tests (no ARI), returns false safely.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    try {
      // Try to fetch a small resource to confirm ARI is reachable
      const channels = await this.client.channels.list();
      return Array.isArray(channels);
    } catch (err) {
      console.warn('Asterisk health check failed', err?.message || err);
      return false;
    }
  }

  async getRecording(callId: string): Promise<import('stream').Readable | null> {
    // Asterisk recording implementation pending; return null for now
    console.warn('getRecording not implemented for Asterisk');
    return null;
  }
}
