/**
 * Bridge Repository Port
 * 
 * Interface defining the contract for bridge persistence operations.
 * Follows Hexagonal Architecture: Domain defines the interface, adapters implement it.
 * Uses only domain types (no framework-specific entity types).
 */

import { Bridge } from '../domain/bridge.domain';

/**
 * Result type for paginated queries
 */
export interface ListBridgesResult {
  bridges: Bridge[];
  total: number;
}

/**
 * Repository interface for Bridge persistence
 * 
 * This port is implemented by adapters (e.g., TypeORM, in-memory, etc.)
 * All methods work with domain types only, not entity types.
 */
export interface BridgeRepositoryPort {
  /**
   * Save a bridge (create or update)
   * Returns the saved bridge with any system-generated fields
   */
  save(bridge: Bridge): Promise<Bridge>;

  /**
   * Find a bridge by ID
   * Returns null if not found
   */
  findById(id: string): Promise<Bridge | null>;

  /**
   * Find all active (non-destroyed) bridges
   * Optionally filtered by organization
   */
  findActive(options?: {
    organizationId?: string;
  }): Promise<Bridge[]>;

  /**
   * Find bridges by organization ID
   * Returns all bridges for the organization (including destroyed)
   */
  findByOrganization(organizationId: string): Promise<Bridge[]>;

  /**
   * List bridges with pagination
   */
  list(options?: {
    organizationId?: string;
    includeDestroyed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ListBridgesResult>;

  /**
   * Delete a bridge permanently
   * Use Bridge.destroy() for soft-delete instead
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a bridge exists
   */
  exists(id: string): Promise<boolean>;
}
