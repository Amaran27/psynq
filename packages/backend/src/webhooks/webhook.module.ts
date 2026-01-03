import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { CallModule } from '../modules/call/call.module';

@Module({
  imports: [CallModule],
  controllers: [WebhookController],
  providers: [],
  exports: [],
})
export class WebhookModule {}
