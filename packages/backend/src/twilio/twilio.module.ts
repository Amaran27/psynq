import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TwilioVoiceController } from './twilio-voice.controller';

@Module({
  imports: [ConfigModule],
  controllers: [TwilioVoiceController],
  providers: [],
  exports: [],
})
export class TwilioModule {}