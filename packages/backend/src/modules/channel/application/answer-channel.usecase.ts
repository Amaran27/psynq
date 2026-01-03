/**
 * Answer Channel Use Case
 * 
 * Application use case for answering a channel.
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ChannelRepositoryPort } from '../ports/channel-repository.port';
import { Channel } from '../domain/channel.domain';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';
import { ChannelEndedError, InvalidChannelStateError, ChannelAlreadyAnsweredError } from '../domain/channel.domain';

export interface AnswerChannelCommand {
  channelId: string;
  organizationId?: string;
}

@Injectable()
export class AnswerChannelUseCase {
  constructor(
    @Inject('CHANNEL_REPOSITORY')
    private readonly channelRepository: ChannelRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Execute the use case
   * @throws NotFoundException if channel not found
   * @throws BadRequestException for business rule violations
   */
  async execute(command: AnswerChannelCommand): Promise<Channel> {
    const channel = await this.channelRepository.findById(command.channelId);

    if (!channel) {
      throw new NotFoundException(`Channel ${command.channelId} not found`);
    }

    try {
      // Business logic is in the domain
      channel.answer();
    } catch (error) {
      if (error instanceof ChannelEndedError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof InvalidChannelStateError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof ChannelAlreadyAnsweredError) {
        // Idempotent - return channel if already answered
        return channel;
      }
      throw error;
    }

    // Persist
    const savedChannel = await this.channelRepository.save(channel);

    // Publish event
    const event: PsynqEvent = {
      type: 'channel.answered',
      timestamp: new Date(),
      organizationId: command.organizationId || 'system',
      payload: {
        channelId: savedChannel.id,
        callId: savedChannel.callId || null,
      },
    };
    await this.eventBus.publish(event);

    return savedChannel;
  }
}
