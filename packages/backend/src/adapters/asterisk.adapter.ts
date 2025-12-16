import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelephonyPort } from '../ports/telephony.port';
import { Call, CallState } from '@psynq/core';
import * as ari from 'ari-client';

@Injectable()
export class AsteriskAdapter implements TelephonyPort, OnModuleInit {
  private client: ari.Client | null = null;
  private onCallReceived: ((call: Call) => void) | null = null;
  private onCallEnded: ((callId: string) => void) | null = null;

  async onModuleInit() {
    await this.connectToAsterisk();
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
  }

  private handleCallHangup(channel: any) {
    if (this.onCallEnded) {
      this.onCallEnded(channel.id);
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

  async injectSupervisor(callId: string, supervisorId: string): Promise<void> {
    // Similar to bridge, but for supervisor
    await this.bridgeCall(callId, supervisorId);
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
}