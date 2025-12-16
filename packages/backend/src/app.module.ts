import { Module, ValidationPipe, forwardRef } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { InfobipAdapter } from './telephony/infobip.adapter';
import { CallController } from './call.controller';
import { CallService } from './services/call.service';
import { CallGateway } from './call.gateway';
import { TwilioModule } from './twilio/twilio.module';

@Module({
  imports: [ConfigModule.forRoot(), TwilioModule],
  controllers: [AppController, CallController],
  providers: [
    AppService,
    TwilioAdapter,
    InfobipAdapter,
    CallService,
    CallGateway,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
