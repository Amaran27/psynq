import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusPort, PsynqEvent } from '../../ports/event-bus.port';

@Injectable()
export class LocalEventBusAdapter implements EventBusPort {
  private readonly logger = new Logger(LocalEventBusAdapter.name);

  constructor(private eventEmitter: EventEmitter2) {}

  async publish(event: PsynqEvent): Promise<void> {
    this.logger.debug(`Publishing event: ${event.type} for org ${event.organizationId}`);
    this.eventEmitter.emit(event.type, event);
  }

  async subscribe(pattern: string, callback: (event: PsynqEvent) => void): Promise<void> {
    this.eventEmitter.on(pattern, callback);
  }
}
