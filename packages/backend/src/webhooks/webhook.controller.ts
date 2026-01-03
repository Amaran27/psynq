import { Controller, Post, Body, Logger, Headers, BadRequestException } from '@nestjs/common';
import { CallService } from '../modules/call/call.service';
import { StandardWebhookEvent } from '../interfaces/webhook.interface';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly callService: CallService) {}

  @Post('asterisk')
  async handleAsteriskWebhook(
    @Body() payload: any,
    @Headers('x-psynq-org-id') orgId: string,
  ) {
    this.logger.log(`Received Asterisk webhook: ${JSON.stringify(payload)}`);

    // Basic validation/mapping - assuming the payload is already close to our standard or we map it
    // In a real scenario, we might need a specific Adapter here to convert provider-specific JSON to StandardWebhookEvent
    // For this implementation, we assume the payload contains the necessary fields or is a generic event we can map.

    const eventType = this.mapAsteriskEventType(payload.type || payload.event);
    if (!eventType) {
      this.logger.warn(`Unknown Asterisk event type: ${payload.type}`);
      return { status: 'ignored' };
    }

    const event: StandardWebhookEvent = {
      provider: 'asterisk',
      eventType,
      organizationId: orgId || payload.organizationId || 'system',
      callId: payload.callId || payload.uniqueid, // Asterisk uniqueid
      externalId: payload.externalId || payload.uniqueid,
      data: payload,
      timestamp: new Date(),
    };

    await this.callService.handleStandardWebhookEvent(event);
    return { status: 'ok' };
  }

  private mapAsteriskEventType(
    type: string,
  ): 'call_started' | 'call_ringing' | 'call_answered' | 'call_ended' | null {
    switch (type?.toLowerCase()) {
      case 'start':
      case 'channelcreate':
        return 'call_started';
      case 'ringing':
      case 'channelstatechange': // Check state for Ringing
        return 'call_ringing';
      case 'answer':
      case 'channelanswer':
        return 'call_answered';
      case 'end':
      case 'hangup':
      case 'channeldestroyed':
        return 'call_ended';
      default:
        return null;
    }
  }
}
