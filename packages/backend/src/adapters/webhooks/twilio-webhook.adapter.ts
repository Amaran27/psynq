import { Injectable } from '@nestjs/common';
import { StandardWebhookEvent, WebhookAdapter } from '../../interfaces/webhook.interface';

@Injectable()
export class TwilioWebhookAdapter implements WebhookAdapter {
  /**
   * Processes a webhook from Twilio and returns a standardized event
   */
  async processWebhook(payload: any): Promise<StandardWebhookEvent | null> {
    if (!payload.CallSid) {
      return null;
    }

    const callSid = payload.CallSid;
    const status = (payload.CallStatus || '').toLowerCase();
    const isInbound = payload.Direction === 'inbound';
    
    let eventType: StandardWebhookEvent['eventType'];
    
    // Map Twilio status to our standardized event types
    switch (status) {
      case 'queued':
      case 'ringing':
        eventType = 'call_ringing';
        break;
      case 'in-progress':
      case 'answered':
        eventType = 'call_answered';
        break;
      case 'completed':
      case 'failed':
      case 'busy':
      case 'no-answer':
      case 'canceled':
        eventType = 'call_ended';
        break;
      default:
        // Unknown status, return null
        return null;
    }

    return {
      provider: 'twilio',
      eventType,
      organizationId: 'system', // TODO: Lookup org based on phone number
      callId: callSid,
      externalId: callSid,
      externalParentId: payload.ParentCallSid,
      data: {
        ...payload,
        isInbound
      },
      timestamp: new Date()
    };
  }

  /**
   * Generates TwiML response for Twilio webhooks
   */
  async generateResponse(event: StandardWebhookEvent): Promise<string | null> {
    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();

    switch (event.eventType) {
      case 'call_ringing':
        // If this is an inbound ringing call, enqueue the caller
        if (event.data.isInbound) {
          const enqueue = twiml.enqueue({ workflowSid: 'WWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' });
          // Add task attributes if needed
          enqueue.task({ 
            priority: '1',
            timeout: '300'
          });
        }
        break;
        
      default:
        // For most events, just return an empty TwiML response
        break;
    }

    return twiml.toString();
  }
}