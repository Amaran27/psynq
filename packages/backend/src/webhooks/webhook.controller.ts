import { Controller, Post, Body, Logger } from '@nestjs/common';
import { CallService } from '../services/call.service';
import { TwilioWebhookAdapter } from '../adapters/webhooks/twilio-webhook.adapter';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  
  constructor(
    private readonly callService: CallService,
    private readonly twilioWebhookAdapter: TwilioWebhookAdapter
  ) {}

  @Post('twilio/voice')
  async handleTwilioVoice(@Body() twilioPayload: any): Promise<any> {
    this.logger.debug('Received Twilio voice webhook');
    this.logger.debug(JSON.stringify(twilioPayload));

    // New unified handler in CallService covers both inbound voice webhook (instructions)
    // and status callbacks (CallStatus updates). We delegate to the service which is
    // idempotent and will create/update calls as needed.
    await this.callService.handleTwilioStatusCallback(twilioPayload).catch(err => {
      this.logger.error('Error handling Twilio status callback', err?.stack || err?.message || err);
    });

    // Process the webhook using our adapter
    const standardEvent = await this.twilioWebhookAdapter.processWebhook(twilioPayload);
    
    if (standardEvent) {
      // Handle the standardized event in the CallService
      await this.callService.handleStandardWebhookEvent(standardEvent).catch(err => {
        this.logger.error('Error handling webhook event', err?.stack || err?.message || err);
      });
      
      // Generate the appropriate response
      const response = await this.twilioWebhookAdapter.generateResponse(standardEvent);
      
      if (response) {
        this.logger.debug('Returning TwiML response');
        return response;
      }
    }

    // For backward compatibility, also call the legacy handler
    await this.callService.handleTwilioStatusCallback(twilioPayload).catch(err => {
      this.logger.error('Error handling Twilio status callback', err?.stack || err?.message || err);
    });

    // Default empty response for status callbacks and other events
    return '';
  }
}

/*
  NOTE: The old implementation below is intentionally left commented out for
  traceability during refactor. The new `handleTwilioStatusCallback` in
  `CallService` centralizes the logic, adds idempotency, and covers more
  CallStatus values.

  // Previous implementation:
  // if (twilioPayload.CallStatus === 'ringing') {
  //   this.callService.handleIncomingCall(twilioPayload);
  // } else if (
  //   twilioPayload.CallStatus === 'completed' ||
  //   twilioPayload.CallStatus === 'failed' ||
  //   twilioPayload.CallStatus === 'no-answer' ||
  //   twilioPayload.CallStatus === 'canceled'
  // ) {
  //   this.callService.handleCallEnded(twilioPayload.CallSid);
  // }
*/