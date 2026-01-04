/**
 * Recording Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingEntity } from './entities/recording.entity';
import { TypeOrmRecordingRepository } from './adapters/typeorm-recording.repository';
import { GetRecordingUseCase } from './application/get-recording.usecase';
import { ListRecordingsUseCase } from './application/list-recordings.usecase';
import { DeleteRecordingUseCase } from './application/delete-recording.usecase';
import { CreateRecordingUseCase } from './application/create-recording.usecase';
import { RecordingController } from './recording.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingEntity]),
    StorageModule,
  ],
  controllers: [RecordingController],
  providers: [
    {
      provide: 'RECORDING_REPOSITORY',
      useClass: TypeOrmRecordingRepository,
    },
    GetRecordingUseCase,
    ListRecordingsUseCase,
    DeleteRecordingUseCase,
    CreateRecordingUseCase,
  ],
  exports: [
    'RECORDING_REPOSITORY',
    CreateRecordingUseCase,
    GetRecordingUseCase,
  ],
})
export class RecordingModule {}
