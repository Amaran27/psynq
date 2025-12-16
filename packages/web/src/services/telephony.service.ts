import { Device, Connection } from '@twilio/voice-sdk';
import { CallApiPort } from '../ports/call-api.port';

/**
 * A service to encapsulate all interactions with the Twilio Voice SDK.
 * This service emits the following events:
 * - 'incoming' (e: CustomEvent<{ connection: Connection }>)
 * - 'connect' (e: CustomEvent<{ connection: Connection }>)
 * - 'disconnect' (e: CustomEvent<{ connection: Connection }>)
 */
export class TelephonyService extends EventTarget {
  private device?: Device;
  private apiAdapter: CallApiPort;

  constructor(apiAdapter: CallApiPort) {
    super();
    this.apiAdapter = apiAdapter;
  }

  /**
   * Initializes the telephony device.
   * @param agentId The unique identifier for the agent.
   */
  public async initialize(agentId: string): Promise<void> {
    if (this.device) {
      return;
    }

    try {
      console.log('Fetching capability token...');
      const token = await this.apiAdapter.getTelephonyToken(agentId);
      console.log('Token fetched. Initializing Twilio Device...');

      this.device = new Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        logLevel: 1,
      });

      this.registerEventHandlers();
      await this.device.register();
      console.log('Twilio Device initialized and registered.');
    } catch (error) {
      console.error('Failed to initialize TelephonyService:', error);
      throw error;
    }
  }

  /**
   * Registers handlers for Twilio Device events.
   */
  private registerEventHandlers(): void {
    if (!this.device) return;

    this.device.on('ready', () => {
      console.log('Twilio.Device Ready!');
    });

    this.device.on('error', (error) => {
      console.error('Twilio.Device Error:', error.message);
    });

    this.device.on('connect', (connection: Connection) => {
      console.log('Successfully established call!', connection);
      this.dispatchEvent(new CustomEvent('connect', { detail: { connection } }));
    });

    this.device.on('disconnect', (connection: Connection) => {
      console.log('Call disconnected.', connection);
      this.dispatchEvent(new CustomEvent('disconnect', { detail: { connection } }));
    });

    this.device.on('incoming', (connection: Connection) => {
      console.log('Incoming connection from ' + connection.parameters.From, connection);
      this.dispatchEvent(new CustomEvent('incoming', { detail: { connection } }));
    });
  }

  /**
   * Accepts an incoming call.
   */
  public accept(connection: Connection): void {
    if (!this.device) {
      throw new Error('Device not initialized.');
    }
    connection.accept();
    console.log('Accepted incoming call.');
  }

  /**
   * Disconnects all active calls.
   */
  public hangup(): void {
    this.device?.disconnectAll();
  }

  /**
   * Makes an outbound call audio connection.
   */
  public async connect(params: { [key: string]: string }): Promise<Connection> {
    if (!this.device) {
      throw new Error('Device not initialized.');
    }
    console.log(`Connecting audio for outbound call with params:`, params);
    return await this.device.connect({ params });
  }

  /**
   * Destroys the device instance.
   */
  public destroy(): void {
    this.device?.destroy();
    this.device = undefined;
  }
}
