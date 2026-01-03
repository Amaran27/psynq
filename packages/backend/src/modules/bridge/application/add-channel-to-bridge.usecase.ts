/**
 * Add Channel to Bridge Use Case
 * 
 * Application use case for adding a channel to a bridge.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge } from '../domain/bridge.domain';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';
import { BridgeDestroyedError, ChannelAlreadyInBridgeError } from '../domain/bridge.domain';

export interface AddChannelToBridgeCommand {
  bridgeId: string;
  channelId: string;
}

@Injectable()
export class AddChannelToBridgeUseCase {
  constructor(
    @Inject('BRIDGE_REPOSITORY')
    private readonly bridgeRepository: BridgeRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Execute the use case
   * @throws NotFoundException if bridge not found
   * @throws BridgeDestroyedError if bridge is destroyed
   * @throws ChannelAlreadyInBridgeError if channel already in bridge
   */
  async execute(command: AddChannelToBridgeCommand): Promise<Bridge> {
    const bridge = await this.bridgeRepository.findById(command.bridgeId);

    if (!bridge) {
      throw new NotFoundException(`Bridge ${command.bridgeId} not found`);
    }

    // Business logic is in the domain
    bridge.addChannel(command.channelId);

    // Persist
    const savedBridge = await this.bridgeRepository.save(bridge);

    // Publish event
    const event: PsynqEvent = {
      type: 'bridge.channel.added',
      timestamp: new Date(),
      organizationId: bridge.organizationId || '',
      payload: {
        bridgeId: bridge.id,
        channelId: command.channelId,
      },
    };
    await this.eventBus.publish(event);

    return savedBridge;
  }
}
