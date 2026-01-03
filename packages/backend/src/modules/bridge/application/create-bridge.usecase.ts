/**
 * Create Bridge Use Case
 * 
 * Application use case for creating a new bridge.
 * Contains orchestration logic but no business rules (those are in the domain).
 * 
 * This is the APPLICATION layer in Hexagonal Architecture.
 * Use cases depend on ports (interfaces), not adapters (implementations).
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge, BridgeType, BridgeTechnology } from '../domain/bridge.domain';
import { TelephonyPort } from '../../../ports/telephony.port';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';

export interface CreateBridgeCommand {
  name: string;
  bridgeType?: BridgeType;
  technology?: BridgeTechnology;
  organizationId?: string;
}

export interface CreateBridgeResult {
  bridge: Bridge;
}

@Injectable()
export class CreateBridgeUseCase {
  constructor(
    @Inject('BRIDGE_REPOSITORY')
    private readonly bridgeRepository: BridgeRepositoryPort,
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Execute the use case
   * Creates a new bridge with auto-generated ID
   */
  async execute(command: CreateBridgeCommand): Promise<CreateBridgeResult> {
    // Generate bridge ID
    const bridgeId = `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create bridge using domain factory
    const bridge = Bridge.create({
      id: bridgeId,
      name: command.name,
      bridgeType: command.bridgeType,
      technology: command.technology,
      organizationId: command.organizationId,
    });

    // Persist bridge
    const savedBridge = await this.bridgeRepository.save(bridge);

    // Publish domain event
    const event: PsynqEvent = {
      type: 'bridge.created',
      timestamp: new Date(),
      organizationId: command.organizationId || '',
      payload: { bridgeId: savedBridge.id },
    };
    await this.eventBus.publish(event);

    return { bridge: savedBridge };
  }
}
