import { Device, Call as TwilioCall } from '@twilio/voice-sdk';
import { TelephonyClient, TelephonyConnection } from '@psynq/core';

class TwilioConnectionWrapper implements TelephonyConnection {
  constructor(private connection: TwilioCall) {}

  get parameters() {
    return this.connection.parameters;
  }

  accept() {
    this.connection.accept();
  }

  reject() {
    this.connection.reject();
  }

  disconnect() {
    this.connection.disconnect();
  }

  mute(isMuted: boolean) {
    this.connection.mute(isMuted);
  }
}

export class TwilioClientAdapter implements TelephonyClient {
  private device?: Device;

  async initialize(token: string): Promise<void> {
    if (this.device) return;

    this.device = new Device(token, {
      // codecPreferences: ['opus', 'pcmu'],
      logLevel: 1,
    });

    try {
      await this.device.register();
    } catch (error) {
      console.error('Twilio device registration failed:', error);
      throw error;
    }
  }

  async connect(params: Record<string, string>): Promise<TelephonyConnection> {
    if (!this.device) throw new Error('Device not initialized');
    const connection = await this.device.connect({ params });
    return new TwilioConnectionWrapper(connection);
  }

  disconnectAll(): void {
    this.device?.disconnectAll();
  }

  on(event: string, handler: (data?: any) => void): void {
    if (!this.device) return;
    
    // Map Twilio events to generic events if needed, or pass through
    // For connection events, we need to wrap the connection object
    if (['incoming', 'connect', 'disconnect'].includes(event)) {
       this.device.on(event, (conn: TwilioCall) => {
         handler(new TwilioConnectionWrapper(conn));
       });
    } else {
       this.device.on(event, handler);
    }
  }

  destroy(): void {
    this.device?.destroy();
    this.device = undefined;
  }
}
