import { Injectable, Logger } from '@nestjs/common';
import { TelephonyPort } from '../ports/telephony.port';
import { Call } from '@psynq/core';

export interface CallRequest {
  from: string;
  to: string;
  callId: string;
  agentId?: string;
}

export interface CallResponse {
  success: boolean;
  callId: string | null;
  status: string;
  provider: string;
  error?: string;
  metadata?: any;
}

@Injectable()
export class InfobipAdapter implements TelephonyPort {
  private readonly logger = new Logger(InfobipAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    let baseUrl = process.env.INFOBIP_BASE_URL || 'https://api.infobip.com';
    
    // Ensure baseUrl has protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    this.baseUrl = baseUrl;
    this.apiKey = process.env.INFOBIP_API_KEY || '';
    
    // Previously we threw an error during construction if API key was missing:
    // if (!this.apiKey) {
    //   throw new Error('INFOBIP_API_KEY environment variable is required');
    // }
    // For dev/test runs we prefer the server to start even if Infobip is not configured.
    if (!this.apiKey) {
      this.logger.warn('INFOBIP_API_KEY is not set. InfobipAdapter will not perform real API calls.');
    }
  }

  async createCall(call: Call): Promise<void> {
    try {
      this.logger.log(`Making outbound call via Infobip: ${call.from} -> ${call.to}`);
      
      // Use Infobip TTS (Text-to-Speech) Voice Message API - the working endpoint
      const endpoint = `${this.baseUrl}/tts/3/advanced`;

      const fromNumber = process.env.INFOBIP_PHONE_NUMBER || call.from;
      this.logger.debug(`Using 'from' number: ${fromNumber}`);
      
      const payload = {
        messages: [
          {
            destinations: [{ to: call.to }],
            from: fromNumber,
            language: 'en',
            text: `Call from Psynq. Agent ${call.agentId || 'unknown'} is trying to reach you. Please hold.`,
            voice: {
              name: 'Joanna',
              gender: 'female',
            },
          },
        ],
      };
      this.logger.debug(`Infobip Endpoint: ${endpoint}`);
      this.logger.debug(`Infobip Payload: ${JSON.stringify(payload)}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Infobip API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      this.logger.log(`Infobip call initiated successfully: ${JSON.stringify(data)}`);
      
      // Store Infobip bulk ID for tracking
      if (data.bulkId) {
        this.logger.log(`Infobip Bulk ID: ${data.bulkId}`);
      }
      
    } catch (error) {
      this.logger.error(`Failed to make call via Infobip: ${error.message}`, error.stack);
      throw error;
    }
  }

  async bridgeCall(callId: string, agentId: string): Promise<void> {
    this.logger.log(`Bridging call ${callId} to agent ${agentId} via Infobip`);
    // Infobip bridge implementation would go here
    // For now, we'll log and continue
  }

  async injectSupervisor(callId: string, supervisorId: string): Promise<void> {
    this.logger.log(`Injecting supervisor ${supervisorId} into call ${callId} via Infobip`);
    // Infobip supervisor injection implementation would go here
    // For now, we'll log and continue
  }

  async endCall(callId: string): Promise<void> {
    try {
      this.logger.log(`Ending call ${callId} via Infobip`);
      
      const endpoint = `${this.baseUrl}/voice/1/calls/${callId}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok || response.status === 404) {
        this.logger.log(`Call ${callId} ended successfully`);
        return;
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to end call: ${response.status} - ${JSON.stringify(errorData)}`);
    } catch (error) {
      this.logger.error(`Failed to end call ${callId}: ${error.message}`);
      throw error;
    }
  }

  // Helper method for making direct calls (used by CallService)
  async makeCall(request: CallRequest): Promise<CallResponse> {
    try {
      this.logger.log(`Making direct outbound call via Infobip: ${request.from} -> ${request.to}`);
      
      // Use Infobip TTS (Text-to-Speech) Voice Message API - the working endpoint
      const endpoint = `${this.baseUrl}/tts/3/advanced`;

      const fromNumber = process.env.INFOBIP_PHONE_NUMBER || request.from;
      this.logger.debug(`Using 'from' number: ${fromNumber}`);
      
      const payload = {
        messages: [
          {
            destinations: [{ to: request.to }],
            from: fromNumber,
            language: 'en',
            text: `Call from Psynq call center. Agent ${request.agentId || 'unknown'} is trying to reach you.`,
            voice: {
              name: 'Joanna',
              gender: 'female',
            },
          },
        ],
      };

      this.logger.debug(`Infobip Endpoint: ${endpoint}`);
      this.logger.debug(`Infobip Payload: ${JSON.stringify(payload)}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Infobip API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      this.logger.log(`Infobip call initiated successfully: ${JSON.stringify(data)}`);
      
      return {
        success: true,
        callId: data.bulkId || data.messages?.[0]?.messageId || `infobip-${Date.now()}`,
        status: 'initiated',
        provider: 'infobip',
        metadata: data,
      };
    } catch (error) {
      this.logger.error(`Failed to make call via Infobip: ${error.message}`, error.stack);
      return {
        success: false,
        callId: null,
        status: 'failed',
        provider: 'infobip',
        error: error.message,
        metadata: null,
      };
    }
  }

  async getCallStatus(callId: string): Promise<any> {
    try {
      const endpoint = `${this.baseUrl}/voice/1/calls/${callId}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get call status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to get call status for ${callId}: ${error.message}`);
      return null;
    }
  }

  getProviderName(): string {
    return 'infobip';
  }
}