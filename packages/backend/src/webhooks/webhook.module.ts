import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { TwilioWebhookAdapter } from '../adapters/webhooks/twilio-webhook.adapter';
import { CallModule } from '../call/call.module';

@Module({
  imports: [CallModule],
  controllers: [WebhookController],
  providers: [TwilioWebhookAdapter],
  exports: [TwilioWebhookAdapter]
})
export class WebhookModule {}