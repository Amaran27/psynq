/**
 * Get Channel Use Case
 * 
 * Application use case for retrieving a channel by ID.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ChannelRepositoryPort } from '../ports/channel-repository.port';
import { Channel } from '../domain/channel.domain';

@Injectable()
export class GetChannelUseCase {
  constructor(
    @Inject('CHANNEL_REPOSITORY')
    private readonly channelRepository: ChannelRepositoryPort,
  ) {}

  /**
   * Execute the use case
   * @throws NotFoundException if channel not found
   */
  async execute(channelId: string): Promise<Channel> {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException(`Channel ${channelId} not found`);
    }

    return channel;
  }
}
