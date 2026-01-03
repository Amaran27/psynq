/**
 * Get Bridge Use Case
 * 
 * Application use case for retrieving a bridge by ID.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge } from '../domain/bridge.domain';

@Injectable()
export class GetBridgeUseCase {
  constructor(
    @Inject('BRIDGE_REPOSITORY')
    private readonly bridgeRepository: BridgeRepositoryPort,
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

    return bridge;
  }
}
