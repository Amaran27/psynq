export interface BridgeOptions {
  /**
   * Whether the primary participant should be muted initially.
   */
  muted?: boolean;
  
  /**
   * Whether to record the bridge/conference.
   */
  record?: boolean;
  
  /**
   * Provider specific options.
   */
  metadata?: Record<string, any>;
}
