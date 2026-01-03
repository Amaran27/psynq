/**
 * Start Recording Use Case
 * 
 * Application use case for starting bridge recording.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge } from '../domain/bridge.domain';
import { EventBusPort, PsynqEvent } from '../../../ports/event-bus.port';
import { BridgeDestroyedError, RecordingAlreadyStartedError } from '../domain/bridge.domain';

export interface StartRecordingCommand {
  bridgeId: string;
  recordingName: string;
}

@Injectable()
export class StartRecordingUseCase {
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
   * @throws RecordingAlreadyStartedError if already recording
   */
  async execute(command: StartRecordingCommand): Promise<Bridge> {
    const bridge = await this.bridgeRepository.findById(command.bridgeId);

    if (!bridge) {
      throw new NotFoundException(`Bridge ${command.bridgeId} not found`);
    }

    // Business logic is in the domain
    bridge.startRecording(command.recordingName);

    // Persist
    const savedBridge = await this.bridgeRepository.save(bridge);

    // Publish event
    const event: PsynqEvent = {
      type: 'bridge.recording.started',
      timestamp: new Date(),
      organizationId: bridge.organizationId || '',
      payload: {
        bridgeId: bridge.id,
        recordingName: command.recordingName,
      },
    };
    await this.eventBus.publish(event);

    return savedBridge;
  }
}
