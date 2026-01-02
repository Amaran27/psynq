/**
 * Standardized webhook event format that all provider adapters should emit
 */
export interface StandardWebhookEvent {
  provider: 'asterisk';
  eventType: 'call_started' | 'call_ringing' | 'call_answered' | 'call_ended';
  organizationId: string;
  callId: string;
  externalId: string;
  externalParentId?: string;
  data: Record<string, any>;
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
   * Generates the appropriate response for the webhook
   */
  generateResponse(event: StandardWebhookEvent): Promise<string | null>;
}
