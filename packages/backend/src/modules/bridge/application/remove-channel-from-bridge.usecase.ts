/**
 * Remove Channel from Bridge Use Case
 * 
 * Application use case for removing a channel from a bridge.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge } from '../domain/bridge.domain';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';
import { BridgeDestroyedError, ChannelNotInBridgeError } from '../domain/bridge.domain';

export interface RemoveChannelFromBridgeCommand {
  bridgeId: string;
  channelId: string;
}

@Injectable()
export class RemoveChannelFromBridgeUseCase {
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
   * @throws ChannelNotInBridgeError if channel not in bridge
   */
  async execute(command: RemoveChannelFromBridgeCommand): Promise<Bridge> {
    const bridge = await this.bridgeRepository.findById(command.bridgeId);

    if (!bridge) {
      throw new NotFoundException(`Bridge ${command.bridgeId} not found`);
    }

    // Business logic is in the domain
    bridge.removeChannel(command.channelId);

    // Persist
    const savedBridge = await this.bridgeRepository.save(bridge);

    // Publish event
    const event: PsynqEvent = {
      type: 'bridge.channel.removed',
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
