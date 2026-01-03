/**
 * Hangup Channel Use Case
 * 
 * Application use case for hanging up a channel.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ChannelRepositoryPort } from '../ports/channel-repository.port';
import { Channel } from '../domain/channel.domain';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';

export interface HangupChannelCommand {
  channelId: string;
  organizationId?: string;
  reason?: string;
}

@Injectable()
export class HangupChannelUseCase {
  constructor(
    @Inject('CHANNEL_REPOSITORY')
    private readonly channelRepository: ChannelRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Execute the use case
   * @throws NotFoundException if channel not found
   */
  async execute(command: HangupChannelCommand): Promise<Channel> {
    const channel = await this.channelRepository.findById(command.channelId);

    if (!channel) {
      throw new NotFoundException(`Channel ${command.channelId} not found`);
    }

    // Business logic is in the domain (idempotent hangup)
    channel.hangup(command.reason);

    // Persist
    const savedChannel = await this.channelRepository.save(channel);

    // Publish event
    const event: PsynqEvent = {
      type: 'channel.hungup',
      timestamp: new Date(),
      organizationId: command.organizationId || 'system',
      payload: {
        channelId: savedChannel.id,
        callId: savedChannel.callId || null,
        reason: command.reason,
      },
    };
    await this.eventBus.publish(event);

    return savedChannel;
  }
}
