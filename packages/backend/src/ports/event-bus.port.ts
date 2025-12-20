export interface PsynqEvent {
  type: string;
  organizationId: string;
  payload: any;
  timestamp: Date;
}

export interface EventBusPort {
  /**
   * Publishes an event to the bus
   */
  publish(event: PsynqEvent): Promise<void>;

  /**
   * Subscribes to a specific event type or pattern
   */
  subscribe(pattern: string, callback: (event: PsynqEvent) => void): Promise<void>;
}
