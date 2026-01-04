/**
 * IVR DTMF Bridge Service
 * 
 * Bridges Asterisk DTMF events from EventBus to DtmfHandlerService
 * This enables IVR flows to collect digits from real phone calls
 */

import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { EventBusPort } from '../../../ports/event-bus.port';
import { DtmfHandlerService } from '../../asterisk/services/dtmf-handler.service';

@Injectable()
export class IVRDtmfBridgeService implements OnModuleInit {
  private readonly logger = new Logger(IVRDtmfBridgeService.name);

  constructor(
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
    private readonly dtmfHandler: DtmfHandlerService,
  ) {}

  async onModuleInit() {
    // Subscribe to DTMF events from Asterisk and route to DTMF handler
    await this.eventBus.subscribe('telephony.dtmf_received', (event) => {
      const { callId, digit } = event.payload;
      this.logger.debug(`DTMF received for call ${callId}: ${digit}`);
      
      // Forward to DTMF handler for collection
      this.dtmfHandler.handleDtmfDigit(callId, digit);
    });

    this.logger.log('✅ IVR DTMF bridge initialized - routing Asterisk DTMF events to IVR flows');
  }
}
