/**
 * Channel Module (Refactored to Hexagonal Architecture)
 * 
 * Module configuration following dependency inversion principle.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmChannelRepositoryAdapter } from './adapters/typeorm-channel-repository.adapter';
import { ChannelRepositoryPort } from './ports/channel-repository.port';
import { CreateChannelUseCase } from './application/create-channel.usecase';
import { GetChannelUseCase } from './application/get-channel.usecase';
import { ListChannelsUseCase } from './application/list-channels.usecase';
import { AnswerChannelUseCase } from './application/answer-channel.usecase';
import { HangupChannelUseCase } from './application/hangup-channel.usecase';
import { PlayMediaUseCase } from './application/play-media.usecase';
import { ChannelController } from './channel.controller';
import { ChannelEntity } from '../../entities/channel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelEntity])],
  controllers: [ChannelController],
  providers: [
    // Adapter implements Port
    TypeOrmChannelRepositoryAdapter,

    // Port token bound to adapter implementation
    {
      provide: 'CHANNEL_REPOSITORY',
      useExisting: TypeOrmChannelRepositoryAdapter,
    },

    // Use cases depend on Port
    CreateChannelUseCase,
    GetChannelUseCase,
    ListChannelsUseCase,
    AnswerChannelUseCase,
    HangupChannelUseCase,
    PlayMediaUseCase,
  ],
  exports: [
    'CHANNEL_REPOSITORY',
  ],
})
export class ChannelModule {}
