import { Module, Global } from '@nestjs/common';
import { DeepgramAdapter } from './deepgram.adapter';

@Global()
@Module({
  providers: [
    {
      provide: 'TRANSCRIPTION_PROVIDER',
      useClass: DeepgramAdapter,
    },
  ],
  exports: ['TRANSCRIPTION_PROVIDER'],
})
export class TranscriptionModule {}
