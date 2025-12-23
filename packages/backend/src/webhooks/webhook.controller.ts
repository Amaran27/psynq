import { Controller, Post, Body, Logger } from '@nestjs/common';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor() {}
}