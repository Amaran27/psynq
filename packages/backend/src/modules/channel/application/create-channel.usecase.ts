/**
 * Create Channel Use Case
 * 
 * Application use case for creating a new outbound channel.
 */

import { Injectable, Inject } from '@nestjs/common';
import { ChannelRepositoryPort } from '../ports/channel-repository.port';
import { Channel, ChannelDirection } from '../domain/channel.domain';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';

export interface CreateChannelCommand {
  endpoint: string;
  organizationId?: string;
  callerId?: string;
  callId?: string;
  channelvars?: Record<string, string>;
}

@Injectable()
export class CreateChannelUseCase {
  constructor(
    @Inject('CHANNEL_REPOSITORY')
    private readonly channelRepository: ChannelRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Execute the use case
   * Creates a new outbound channel with auto-generated ID
   */
  async execute(command: CreateChannelCommand): Promise<Channel> {
    // Generate channel ID
    const channelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create channel using domain factory
    const channel = Channel.create({
      id: channelId,
      endpoint: command.endpoint,
      organizationId: command.organizationId,
      callId: command.callId,
      direction: ChannelDirection.OUTBOUND,
      callerId: command.callerId,
      channelvars: command.channelvars,
    });

    // Persist channel
    const savedChannel = await this.channelRepository.save(channel);

    // Publish event
    const event: PsynqEvent = {
      type: 'channel.created',
      timestamp: new Date(),
      organizationId: command.organizationId || 'system',
      payload: {
        channelId: savedChannel.id,
        callId: command.callId || null,
      },
    };
    await this.eventBus.publish(event);

    return savedChannel;
  }
}
