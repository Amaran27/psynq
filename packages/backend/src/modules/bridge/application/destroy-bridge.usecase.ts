/**
 * Destroy Bridge Use Case
 * 
 * Application use case for destroying a bridge.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge } from '../domain/bridge.domain';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';

@Injectable()
export class DestroyBridgeUseCase {
  constructor(
    @Inject('BRIDGE_REPOSITORY')
    private readonly bridgeRepository: BridgeRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Execute the use case
   * @throws NotFoundException if bridge not found
   */
  async execute(bridgeId: string): Promise<Bridge> {
    const bridge = await this.bridgeRepository.findById(bridgeId);

    if (!bridge) {
      throw new NotFoundException(`Bridge ${bridgeId} not found`);
    }

    // Business logic is in the domain (idempotent destroy)
    bridge.destroy();

    // Persist
    const savedBridge = await this.bridgeRepository.save(bridge);

    // Publish event
    const event: PsynqEvent = {
      type: 'bridge.destroyed',
      timestamp: new Date(),
      organizationId: bridge.organizationId || '',
      payload: { bridgeId: bridge.id },
    };
    await this.eventBus.publish(event);

    return savedBridge;
  }
}
