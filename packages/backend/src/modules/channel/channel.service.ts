import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelEntity, ChannelState, ChannelDirection } from '../../entities/channel.entity';
import { TelephonyPort } from '../../ports/telephony.port';
import { EventBusPort } from '../../ports/event-bus.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(ChannelEntity)
    private readonly channelRepo: Repository<ChannelEntity>,
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Create an outbound channel (originate a call)
   */
  async createChannel(
    endpoint: string,
    organizationId: string | null,
    callerId?: string,
    callId?: string,
    channelvars?: Record<string, string>,
  ): Promise<ChannelEntity> {
    // Generate a temporary channel ID (will be updated by ARI events)
    const tempChannelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create channel record
    const channel = this.channelRepo.create({
      id: tempChannelId,
      organizationId: organizationId || undefined,
      callId,
      state: ChannelState.DOWN,
      direction: ChannelDirection.OUTBOUND,
      callerName: callerId || 'Unknown',
      callerNumber: callerId || 'Unknown',
      dialedNumber: endpoint,
      channelvars,
    });

    const saved = await this.channelRepo.save(channel);

    await this.eventBus.publish({
      type: 'channel.created',
      organizationId: organizationId || 'system',
      payload: { channelId: saved.id, callId: callId || null },
      timestamp: new Date(),
    });

    return saved;
  }

  /**
   * Get channel by ID
   */
  async getChannel(channelId: string): Promise<ChannelEntity> {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: ['organization', 'call'],
    });

    if (!channel) {
      throw new NotFoundException(`Channel ${channelId} not found`);
    }

    return channel;
  }

  /**
   * List all active channels (not ended)
   */
  async listActiveChannels(organizationId?: string): Promise<ChannelEntity[]> {
    const query = this.channelRepo
      .createQueryBuilder('channel')
      .where('channel.endedAt IS NULL')
      .orderBy('channel.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('channel.organizationId = :organizationId', {
        organizationId,
      });
    }

    return query.getMany();
  }

  /**
   * Answer a channel
   */
  async answerChannel(
    channelId: string,
    organizationId: string | null,
  ): Promise<ChannelEntity> {
    const channel = await this.getChannel(channelId);

    if (channel.state === ChannelState.UP) {
      return channel; // Already answered (idempotent)
    }

    if (
      channel.state !== ChannelState.RING &&
      channel.state !== ChannelState.RINGING
    ) {
      throw new BadRequestException(
        `Cannot answer channel in state: ${channel.state}`,
      );
    }

    // Delegate to telephony provider (if channel has a call)
    if (channel.callId) {
      // Telephony provider's answerCall expects (orgId, callId)
      // For now, just update local state - ARI events will sync
    }

    // Update channel state
    channel.state = ChannelState.UP;
    channel.answeredAt = new Date();
    const updated = await this.channelRepo.save(channel);

    await this.eventBus.publish({
      type: 'channel.answered',
      organizationId: organizationId || 'system',
      payload: { channelId, callId: channel.callId || null },
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Hang up a channel
   */
  async hangupChannel(
    channelId: string,
    organizationId: string | null,
    reason?: string,
  ): Promise<ChannelEntity> {
    const channel = await this.getChannel(channelId);

    if (channel.endedAt) {
      return channel; // Already ended (idempotent)
    }

    // Delegate to telephony provider (if channel has a call)
    if (channel.callId) {
      // Use hangupCall from TelephonyPort
      // Will be handled by ARI events in production
    }

    // Update channel state
    channel.state = ChannelState.DOWN;
    channel.endedAt = new Date();
    const updated = await this.channelRepo.save(channel);

    await this.eventBus.publish({
      type: 'channel.hungup',
      organizationId: organizationId || 'system',
      payload: { channelId, callId: channel.callId || null, reason },
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Play media to a channel
   */
  async playMedia(
    channelId: string,
    organizationId: string | null,
    media: string,
    lang?: string,
  ): Promise<void> {
    const channel = await this.getChannel(channelId);

    if (channel.state !== ChannelState.UP) {
      throw new BadRequestException(
        `Cannot play media to channel in state: ${channel.state}`,
      );
    }

    // Delegate to telephony provider
    await this.telephonyProvider.playAudio(
      organizationId,
      channelId,
      media,
    );

    await this.eventBus.publish({
      type: 'channel.media_played',
      organizationId: organizationId || 'system',
      payload: { channelId, media },
      timestamp: new Date(),
    });
  }

  /**
   * Speak text to a channel (TTS)
   */
  async speak(
    channelId: string,
    organizationId: string | null,
    text: string,
    voice?: string,
  ): Promise<void> {
    const channel = await this.getChannel(channelId);

    if (channel.state !== ChannelState.UP) {
      throw new BadRequestException(
        `Cannot speak to channel in state: ${channel.state}`,
      );
    }

    // Delegate to telephony provider
    // Note: speak() is not yet in TelephonyPort interface
    // Will be added when TTS support is implemented
    // For now, just emit event
    // await this.telephonyProvider.speak(organizationId, channelId, text, voice);

    await this.eventBus.publish({
      type: 'channel.text_spoken',
      organizationId: organizationId || 'system',
      payload: { channelId, text },
      timestamp: new Date(),
    });
  }

  /**
   * Update channel from external event (Asterisk ARI webhook)
   */
  async updateChannelFromEvent(
    channelId: string,
    updates: Partial<ChannelEntity>,
  ): Promise<ChannelEntity> {
    let channel = await this.channelRepo.findOne({ where: { id: channelId } });

    if (!channel) {
      // Create channel if it doesn't exist (inbound call)
      channel = this.channelRepo.create({
        id: channelId,
        ...updates,
      });
    } else {
      Object.assign(channel, updates);
    }

    return this.channelRepo.save(channel);
  }
}
