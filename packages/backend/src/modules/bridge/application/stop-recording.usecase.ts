/**
 * Stop Recording Use Case
 * 
 * Application use case for stopping bridge recording.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge } from '../domain/bridge.domain';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';
import { BridgeDestroyedError, RecordingNotActiveError } from '../domain/bridge.domain';

@Injectable()
export class StopRecordingUseCase {
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
   * @throws RecordingNotActiveError if not recording (idempotent - domain handles this)
   */
  async execute(bridgeId: string): Promise<Bridge> {
    const bridge = await this.bridgeRepository.findById(bridgeId);

    if (!bridge) {
      throw new NotFoundException(`Bridge ${bridgeId} not found`);
    }

    // Business logic is in the domain (idempotent stop)
    bridge.stopRecording();

    // Persist
    const savedBridge = await this.bridgeRepository.save(bridge);

    // Publish event
    const event: PsynqEvent = {
      type: 'bridge.recording.stopped',
      timestamp: new Date(),
      organizationId: bridge.organizationId || '',
      payload: {
        bridgeId: bridge.id,
        recordingName: bridge.recordingName || '',
      },
    };
    await this.eventBus.publish(event);

    return savedBridge;
  }
}
