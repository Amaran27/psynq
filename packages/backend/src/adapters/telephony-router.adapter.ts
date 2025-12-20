import { Injectable, Optional, Logger } from '@nestjs/common';
import { TelephonyPort } from '../ports/telephony.port';
import { Call } from '@psynq/core';
import { TwilioAdapter } from './twilio.adapter';
import { AsteriskAdapter } from './asterisk.adapter';
import { TelephonyCapabilities } from '../interfaces/telephony-capabilities.interface';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import { BridgeOptions } from '../interfaces/bridge-options.interface';
import { Readable } from 'stream';
import { SettingsService } from '../services/settings.service';

@Injectable()
export class TelephonyRouterAdapter implements TelephonyPort {
  private readonly logger = new Logger(TelephonyRouterAdapter.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly twilioAdapter: TwilioAdapter,
    private readonly asteriskAdapter: AsteriskAdapter,
  ) {}

  private async selectProvider(orgId: string | null, to: string): Promise<'twilio' | 'asterisk'> {
    // For now, default to Asterisk for all calls
    // TODO: Add logic to use Twilio for specific regions/cost optimization
    return 'asterisk';
  }

  private getAdapterByProviderName(provider: string): TelephonyPort {
    switch (provider) {
      case 'twilio': return this.twilioAdapter;
      case 'asterisk':
        if (this.asteriskAdapter) return this.asteriskAdapter;
        this.logger.warn('Asterisk adapter selected but not available, falling back to Twilio');
        return this.twilioAdapter;
      default: 
        this.logger.warn(`Unknown provider ${provider}, defaulting to Asterisk`);
        return this.asteriskAdapter || this.twilioAdapter;
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

  async createCall(call: Call): Promise<string | void> {
    const orgId = (call as any).organizationId || null;
    const provider = await this.selectProvider(orgId, call.to);
    this.logger.log(`Routing createCall to ${provider} for org ${orgId || 'system'}`);
    return this.getAdapterByProviderName(provider).createCall(call);
  }

  async bridgeParticipants(call: Call, targetIdentifier: string, options?: BridgeOptions): Promise<CallParticipant | void> {
    const orgId = (call as any).organizationId || null;
    const provider = await this.selectProvider(orgId, call.to);
    const adapter = this.getAdapterByProviderName(provider);
    const capabilities = adapter.getCapabilities();
    if (!capabilities.supportsBridgeCall) throw new Error(`Bridge not supported by provider ${provider}`);
    return adapter.bridgeParticipants(call, targetIdentifier, options);
  }

  async redirectCall(call: Call, target: string): Promise<void> {
    const orgId = (call as any).organizationId || null;
    const provider = await this.selectProvider(orgId, call.to);
    const adapter = this.getAdapterByProviderName(provider);
    if (adapter.redirectCall) return adapter.redirectCall(call, target);
    this.logger.warn(`Selected adapter ${provider} does not support redirectCall`);
  }

  async injectSupervisor(call: Call, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant | void> {
    const orgId = (call as any).organizationId || null;
    const provider = await this.selectProvider(orgId, call.to);
    const adapter = this.getAdapterByProviderName(provider);
    const capabilities = adapter.getCapabilities();
    
    if (!capabilities.supportsSupervisorInjection) throw new Error(`Supervisor injection not supported by provider ${provider}`);
    if (options?.mode === 'barge' && !capabilities.supportsBarge) throw new Error(`Barge mode not supported by provider ${provider}`);
    if (options?.mode === 'whisper' && !capabilities.supportsWhisper) throw new Error(`Whisper mode not supported by provider ${provider}`);

    return adapter.injectSupervisor(call, supervisorId, options);
  }

  async setParticipantMuted(orgId: string | null, participantId: string, muted: boolean): Promise<void> {
    try { await this.twilioAdapter.setParticipantMuted(orgId, participantId, muted); return; } catch (e) {}
    if (this.asteriskAdapter) { try { await this.asteriskAdapter.setParticipantMuted(orgId, participantId, muted); return; } catch (e) {} }
    this.logger.warn(`Could not route setParticipantMuted for ${participantId}`);
  }

  async setParticipantOnHold(orgId: string | null, participantId: string, onHold: boolean): Promise<void> {
    try { await this.twilioAdapter.setParticipantOnHold(orgId, participantId, onHold); return; } catch (e) {}
    if (this.asteriskAdapter) { try { await this.asteriskAdapter.setParticipantOnHold(orgId, participantId, onHold); return; } catch (e) {} }
  }

  async endCall(call: Call): Promise<void> {
    const orgId = (call as any).organizationId || null;
    const provider = await this.selectProvider(orgId, call.to);
    return this.getAdapterByProviderName(provider).endCall(call);
  }

  async getRecording(callId: string): Promise<Readable | null> {
      return null;
  }

  async findQueueByName(queueName: string): Promise<any | null> {
    return this.twilioAdapter.findQueueByName ? this.twilioAdapter.findQueueByName(queueName) : null;
  }

  async getFirstCallFromQueue(queueSid: string): Promise<any | null> {
    return this.twilioAdapter.getFirstCallFromQueue ? this.twilioAdapter.getFirstCallFromQueue(queueSid) : null;
  }

  onCallReceived(callback: (call: Call) => void): void {
    if (this.asteriskAdapter) this.asteriskAdapter.onCallReceived?.(callback);
    this.twilioAdapter.onCallReceived?.(callback);
  }

  onCallEnded(callback: (callId: string) => void): void {
    if (this.asteriskAdapter) this.asteriskAdapter.onCallEnded?.(callback);
    this.twilioAdapter.onCallEnded?.(callback);
  }

  onParticipantJoined(callback: (participant: CallParticipant) => void): void {
    if (this.asteriskAdapter) this.asteriskAdapter.onParticipantJoined?.(callback);
    this.twilioAdapter.onParticipantJoined?.(callback);
  }
}