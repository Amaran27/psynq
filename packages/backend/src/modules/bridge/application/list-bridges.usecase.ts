/**
 * List Bridges Use Case
 * 
 * Application use case for listing active bridges.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge } from '../domain/bridge.domain';

export interface ListBridgesQuery {
  organizationId?: string;
}

@Injectable()
export class ListBridgesUseCase {
  constructor(
    @Inject('BRIDGE_REPOSITORY')
    private readonly bridgeRepository: BridgeRepositoryPort,
  ) {}

  /**
   * Execute the use case
   * Returns all active (non-destroyed) bridges, optionally filtered by organization
   */
  async execute(query: ListBridgesQuery): Promise<Bridge[]> {
    return this.bridgeRepository.findActive({
      organizationId: query.organizationId,
    });
  }
}
