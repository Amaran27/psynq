/**
 * Standardized webhook event format that all provider adapters should emit
 */
export interface StandardWebhookEvent {
  provider: 'twilio' | 'asterisk' | 'infobip';
  eventType: 'call_started' | 'call_ended' | 'call_answered' | 'call_ringing' | 'participant_added' | 'participant_removed' | 'participant_updated';
  callId: string;
  externalId?: string; // Provider's external call ID
  parentCallSid?: string; // Parent call SID for child legs
  data: Record<string, any>; // Provider-specific event data
  timestamp: Date;
}

/**
 * Interface that all webhook adapters should implement
 */
export interface WebhookAdapter {
  /**
   * Processes a webhook from a provider and returns a standardized event
   */
  processWebhook(payload: any): Promise<StandardWebhookEvent | null>;
  
  /**
   * Generates the appropriate response for the webhook (e.g., TwiML for Twilio)
   */
  generateResponse(event: StandardWebhookEvent): Promise<string | null>;
}