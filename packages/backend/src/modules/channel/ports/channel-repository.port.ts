/**
 * Channel Repository Port
 * 
 * Interface defining the contract for channel persistence operations.
 * Follows Hexagonal Architecture: Domain defines the interface, adapters implement it.
 * Uses only domain types (no framework-specific entity types).
 */

import { Channel, ChannelState } from '../domain/channel.domain';

/**
 * Result type for paginated queries
 */
export interface ListChannelsResult {
  channels: Channel[];
  total: number;
}

/**
 * Repository interface for Channel persistence
 * 
 * This port is implemented by adapters (e.g., TypeORM, in-memory, etc.)
 * All methods work with domain types only, not entity types.
 */
export interface ChannelRepositoryPort {
  /**
   * Save a channel (create or update)
   * Returns the saved channel with any system-generated fields
   */
  save(channel: Channel): Promise<Channel>;

  /**
   * Find a channel by ID
   * Returns null if not found
   */
  findById(id: string): Promise<Channel | null>;

  /**
   * Find all active (not ended) channels
   * Optionally filtered by organization
   */
  findActive(options?: {
    organizationId?: string;
  }): Promise<Channel[]>;

  /**
   * Find channels by organization ID
   * Returns all channels for the organization (including ended)
   */
  findByOrganization(organizationId: string): Promise<Channel[]>;

  /**
   * Find channels by call ID
   */
  findByCallId(callId: string): Promise<Channel[]>;

  /**
   * Find channels by bridge ID
   */
  findByBridgeId(bridgeId: string): Promise<Channel[]>;

  /**
   * List channels with pagination and filters
   */
  list(options?: {
    organizationId?: string;
    callId?: string;
    bridgeId?: string;
    state?: ChannelState;
    includeEnded?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ListChannelsResult>;

  /**
   * Delete a channel permanently
   * Use Channel.hangup() for soft-delete instead
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a channel exists
   */
  exists(id: string): Promise<boolean>;
}
