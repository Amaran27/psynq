import { Controller, Post, Body, Logger } from '@nestjs/common';
import { CallService } from '../services/call.service';
import twilio from 'twilio';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  constructor(private readonly callService: CallService) {}

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

    // The Voice webhook (when Twilio expects TwiML instructions) will often be for inbound calls.
    // If this is an inbound call ringing event, instruct Twilio to enqueue the caller.
    const twiml = new twilio.twiml.VoiceResponse();

    // If Twilio is requesting instructions for an inbound ringing call, respond with enqueue.
    // If not (e.g., this is a status callback), returning an empty 200 is fine.
    const isInbound = twilioPayload.Direction === 'inbound' || twilioPayload.To?.includes(process.env.TWILIO_PHONE_NUMBER || '');
    const status = (twilioPayload.CallStatus || '').toLowerCase();

    if (isInbound && status === 'ringing') {
      twiml.say('Thank you for calling. Please wait for the next available agent.');
      twiml.enqueue('support');
      return twiml.toString();
    }

    // For status callbacks and other events, Twilio just needs a 200 OK.
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