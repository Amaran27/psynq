import { Controller, Post, Body } from '@nestjs/common';
import { CallService } from '../services/call.service';
import twilio from 'twilio';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly callService: CallService) {}

  @Post('twilio/voice')
  handleTwilioVoice(@Body() twilioPayload: any): any {
    console.log('Received Twilio voice webhook:', twilioPayload);

    // Depending on the webhook type (e.g., call status changes)
    // you can delegate to different methods in your CallService.

    // For a new incoming call, Twilio sends a payload with CallStatus: 'ringing'
    if (twilioPayload.CallStatus === 'ringing') {
      // It's a new incoming call. Let's handle it.
      this.callService.handleIncomingCall(twilioPayload);
    } else if (
      twilioPayload.CallStatus === 'completed' ||
      twilioPayload.CallStatus === 'failed' ||
      twilioPayload.CallStatus === 'no-answer' ||
      twilioPayload.CallStatus === 'canceled'
    ) {
      // The call has ended.
      this.callService.handleCallEnded(twilioPayload.CallSid);
    }
    
    // Twilio expects a TwiML response to know what to do with the call.
    const twiml = new twilio.twiml.VoiceResponse();

    // For new incoming calls, put them in a queue.
    if (twilioPayload.CallStatus === 'ringing') {
      twiml.say('Thank you for calling. Please wait for the next available agent.');
      twiml.enqueue('support');
    } else {
      // For other statuses, we don't need to do anything further with the call.
      twiml.hangup();
    }

    return twiml.toString();
  }
}
