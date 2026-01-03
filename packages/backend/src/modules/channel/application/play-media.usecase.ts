/**
 * Play Media Use Case
 * 
 * Application use case for playing media to a channel.
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ChannelRepositoryPort } from '../ports/channel-repository.port';
import { Channel } from '../domain/channel.domain';
import { TelephonyPort } from '../../../ports/telephony.port';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';

export interface PlayMediaCommand {
  channelId: string;
  organizationId?: string;
  media: string;
  lang?: string;
}

@Injectable()
export class PlayMediaUseCase {
  constructor(
    @Inject('CHANNEL_REPOSITORY')
    private readonly channelRepository: ChannelRepositoryPort,
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Execute the use case
   * @throws NotFoundException if channel not found
   * @throws BadRequestException if channel can't play media
   */
  async execute(command: PlayMediaCommand): Promise<void> {
    const channel = await this.channelRepository.findById(command.channelId);

    if (!channel) {
      throw new NotFoundException(`Channel ${command.channelId} not found`);
    }

    // Business rule check
    if (!channel.canPlayMedia()) {
      throw new BadRequestException(
        `Cannot play media to channel in state: ${channel.state}`,
      );
    }

    // Delegate to telephony provider
    await this.telephonyProvider.playAudio(
      command.organizationId || 'system',
      command.channelId,
      command.media,
    );

    // Publish event
    const event: PsynqEvent = {
      type: 'channel.media_played',
      timestamp: new Date(),
      organizationId: command.organizationId || 'system',
      payload: {
        channelId: command.channelId,
        media: command.media,
      },
    };
    await this.eventBus.publish(event);
  }
}
