/**
 * DTMF Handler Service
 * 
 * Handles DTMF digit collection via Asterisk ARI
 */

import { Injectable, Logger } from '@nestjs/common';

export interface DtmfCollectionOptions {
  minDigits?: number;
  maxDigits: number;
  timeout: number; // milliseconds
  finishOnKey?: string; // '#' or '*'
}

@Injectable()
export class DtmfHandlerService {
  private readonly logger = new Logger(DtmfHandlerService.name);
  private pendingCollections = new Map<string, {
    resolve: (digits: string) => void;
    reject: (error: Error) => void;
    digits: string;
    timer: NodeJS.Timeout;
    options: DtmfCollectionOptions;
  }>();

  /**
   * Start collecting DTMF digits for a call
   */
  async collectDigits(
    callId: string,
    channelId: string,
    options: DtmfCollectionOptions,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        const collection = this.pendingCollections.get(callId);
        if (collection) {
          this.pendingCollections.delete(callId);
          
          // Check if we have minimum digits
          if (options.minDigits && collection.digits.length < options.minDigits) {
            reject(new Error('Timeout waiting for minimum digits'));
          } else {
            resolve(collection.digits);
          }
        }
      }, options.timeout);

      this.pendingCollections.set(callId, {
        resolve,
        reject,
        digits: '',
        timer,
        options,
      });

      this.logger.log(`Started DTMF collection for call ${callId} (max: ${options.maxDigits}, timeout: ${options.timeout}ms)`);
    });
  }

  /**
   * Handle DTMF digit received from Asterisk
   */
  handleDtmfDigit(callId: string, digit: string): void {
    const collection = this.pendingCollections.get(callId);
    if (!collection) {
      return;
    }

    this.logger.log(`DTMF digit received for call ${callId}: ${digit}`);

    // Check for finish key
    if (collection.options.finishOnKey && digit === collection.options.finishOnKey) {
      clearTimeout(collection.timer);
      this.pendingCollections.delete(callId);
      collection.resolve(collection.digits);
      return;
    }

    // Add digit to buffer
    collection.digits += digit;

    // Check if max digits reached
    if (collection.digits.length >= collection.options.maxDigits) {
      clearTimeout(collection.timer);
      this.pendingCollections.delete(callId);
      collection.resolve(collection.digits);
      return;
    }
  }

  /**
   * Cancel pending collection
   */
  cancelCollection(callId: string): void {
    const collection = this.pendingCollections.get(callId);
    if (collection) {
      clearTimeout(collection.timer);
      this.pendingCollections.delete(callId);
      collection.reject(new Error('Collection cancelled'));
    }
  }
}
