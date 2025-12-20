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
    this.logger.debug(`Received Twilio voice webhook: ${twilioPayload.CallSid} [${twilioPayload.CallStatus}]`);

    // Process the webhook using our adapter to get a standardized event
    const standardEvent = await this.twilioWebhookAdapter.processWebhook(twilioPayload);
    
    if (standardEvent) {
      // Handle the standardized event in the CallService
      await this.callService.handleStandardWebhookEvent(standardEvent).catch(err => {
        this.logger.error('Error handling standardized webhook event', err?.stack || err?.message || err);
      });
      
      // Generate the appropriate TwiML response if needed
      const response = await this.twilioWebhookAdapter.generateResponse(standardEvent);
      if (response) {
        return response;
      }
    }

    return '';
  }
}