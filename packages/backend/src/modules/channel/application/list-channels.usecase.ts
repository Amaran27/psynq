/**
 * List Channels Use Case
 * 
 * Application use case for listing active channels.
 */

import { Injectable, Inject } from '@nestjs/common';
import { ChannelRepositoryPort } from '../ports/channel-repository.port';
import { Channel } from '../domain/channel.domain';

export interface ListChannelsQuery {
  organizationId?: string;
}

@Injectable()
export class ListChannelsUseCase {
  constructor(
    @Inject('CHANNEL_REPOSITORY')
    private readonly channelRepository: ChannelRepositoryPort,
  ) {}

  /**
   * Execute the use case
   * Returns all active (not ended) channels, optionally filtered by organization
   */
  async execute(query: ListChannelsQuery): Promise<Channel[]> {
    return this.channelRepository.findActive({
      organizationId: query.organizationId,
    });
  }
}
