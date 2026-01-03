/**
 * DNC Repository Port (Interface)
 * 
 * Hexagonal Architecture - Port defines what the domain needs
 * Adapters implement how to fulfill those needs
 */

import { DNCEntry, DNCSource, DNCStatus } from '../domain/dnc.domain';

export interface DNCRepositoryPort {
  /**
   * Save a DNC entry (create or update)
   */
  save(entry: DNCEntry): Promise<DNCEntry>;

  /**
   * Save multiple DNC entries (bulk insert)
   */
  saveMany(entries: DNCEntry[]): Promise<DNCEntry[]>;

  /**
   * Find entry by ID
   */
  findById(id: string): Promise<DNCEntry | null>;

  /**
   * Find entry by phone number
   */
  findByPhoneNumber(phoneNumber: string, organizationId?: string): Promise<DNCEntry | null>;

  /**
   * Check if phone number is on DNC list
   */
  isOnDNCList(phoneNumber: string, organizationId?: string): Promise<boolean>;

  /**
   * Find all DNC entries with optional filters
   */
  findAll(filters?: {
    organizationId?: string;
    source?: DNCSource;
    status?: DNCStatus;
  }): Promise<DNCEntry[]>;

  /**
   * Delete a DNC entry
   */
  delete(id: string): Promise<void>;

  /**
   * Delete by phone number
   */
  deleteByPhoneNumber(phoneNumber: string, organizationId?: string): Promise<void>;

  /**
   * Check if entry exists
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Token for dependency injection
 */
export const DNC_REPOSITORY_PORT = Symbol('DNCRepositoryPort');
