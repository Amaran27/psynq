import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { TranscriptionEntity } from './infrastructure/persistence/typeorm/entities/transcription.entity';
import { TranscriptionSegmentEntity } from './infrastructure/persistence/typeorm/entities/transcription-segment.entity';
import { SentimentEntity } from './infrastructure/persistence/typeorm/entities/sentiment.entity';

// Port tokens
import {
  TRANSCRIPTION_REPOSITORY_PORT,
  TRANSCRIPTION_SEGMENT_REPOSITORY_PORT,
  SENTIMENT_REPOSITORY_PORT,
  STT_PROVIDER_PORT,
} from './domain/ports';

// Adapters
import { TypeOrmTranscriptionRepositoryAdapter } from './infrastructure/adapters/typeorm-transcription-repository.adapter';
import { TypeOrmTranscriptionSegmentRepositoryAdapter } from './infrastructure/adapters/typeorm-transcription-segment-repository.adapter';
import { TypeOrmSentimentRepositoryAdapter } from './infrastructure/adapters/typeorm-sentiment-repository.adapter';
import { WhisperSTTProviderAdapter } from './infrastructure/adapters/whisper-stt-provider.adapter';

// Services
import { TranscriptionService } from './application/transcription.service';
import { SentimentService } from './application/sentiment.service';

// Controllers
import { TranscriptionController } from './presentation/transcription.controller';
import { SentimentController } from './presentation/sentiment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TranscriptionEntity,
      TranscriptionSegmentEntity,
      SentimentEntity,
    ]),
    HttpModule,
  ],
  controllers: [TranscriptionController, SentimentController],
  providers: [
    // Repository adapters
    {
      provide: TRANSCRIPTION_REPOSITORY_PORT,
      useClass: TypeOrmTranscriptionRepositoryAdapter,
    },
    {
      provide: TRANSCRIPTION_SEGMENT_REPOSITORY_PORT,
      useClass: TypeOrmTranscriptionSegmentRepositoryAdapter,
    },
    {
      provide: SENTIMENT_REPOSITORY_PORT,
      useClass: TypeOrmSentimentRepositoryAdapter,
    },
    // STT provider adapter
    {
      provide: STT_PROVIDER_PORT,
      useClass: WhisperSTTProviderAdapter,
    },
    // Services
    TranscriptionService,
    SentimentService,
  ],
  exports: [TranscriptionService, SentimentService],
})
export class TranscriptionModule {}
