import { TelephonyClient, TelephonyConnection } from '@psynq/core';
import { CallApiPort } from '../ports/call-api.port';
import { TwilioClientAdapter } from './twilio-client.adapter';

/**
 * A service to encapsulate all interactions with the Telephony Client.
 * This service emits the following events:
 * - 'incoming' (e: CustomEvent<{ connection: TelephonyConnection }>)
 * - 'connect' (e: CustomEvent<{ connection: TelephonyConnection }>)
 * - 'disconnect' (e: CustomEvent<{ connection: TelephonyConnection }>)
 */
export class TelephonyService extends EventTarget {
  private client: TelephonyClient;
  private apiAdapter: CallApiPort;

  constructor(apiAdapter: CallApiPort) {
    super();
    this.apiAdapter = apiAdapter;
    this.client = new TwilioClientAdapter();
  }

  /**
   * Initializes the telephony device.
   * @param agentId The unique identifier for the agent.
   * @param token The authentication token.
   */
  public async initialize(agentId: string, token: string): Promise<void> {
    try {
      console.log('Fetching capability token...');
      const telephonyToken = await this.apiAdapter.getTelephonyToken(agentId, token);
      console.log('Token fetched. Initializing Device...');

      await this.client.initialize(telephonyToken);
      this.registerEventHandlers();
      console.log('Device initialized and registered.');
    } catch (error) {
      console.error('Failed to initialize TelephonyService:', error);
      throw error;
    }
  }

  /**
   * Registers handlers for Device events.
   */
  private registerEventHandlers(): void {
    this.client.on('ready', () => {
      console.log('Device Ready!');
    });

    this.client.on('error', (error) => {
      console.error('Device Error:', error.message);
    });

    this.client.on('connect', (connection: TelephonyConnection) => {
      console.log('Successfully established call!', connection);
      this.dispatchEvent(new CustomEvent('connect', { detail: { connection } }));
    });

    this.client.on('disconnect', (connection: TelephonyConnection) => {
      console.log('Call disconnected.', connection);
      this.dispatchEvent(new CustomEvent('disconnect', { detail: { connection } }));
    });

    this.client.on('incoming', (connection: TelephonyConnection) => {
      console.log('Incoming connection from ' + connection.parameters.From, connection);
      this.dispatchEvent(new CustomEvent('incoming', { detail: { connection } }));
    });
  }

  /**
   * Accepts an incoming call.
   */
  public accept(connection: TelephonyConnection): void {
    connection.accept();
    console.log('Accepted incoming call.');
  }

  /**
   * Disconnects all active calls.
   */
  public hangup(): void {
    this.client.disconnectAll();
  }

  /**
   * Makes an outbound call audio connection.
   */
  public async connect(params: { [key: string]: string }): Promise<TelephonyConnection> {
    console.log(`Connecting audio for outbound call with params:`, params);
    return await this.client.connect(params);
  }

  /**
   * Destroys the device instance.
   */
  public destroy(): void {
    this.client.destroy();
  }
}
