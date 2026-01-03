/**
 * DialingSession Repository Port (Interface)
 * 
 * Hexagonal Architecture - Port defines what the domain needs
 * Adapters implement how to fulfill those needs
 */

import { DialingSession, SessionStatus } from '../domain/dialing-session.domain';

export interface DialingSessionRepositoryPort {
  /**
   * Save a dialing session (create or update)
   */
  save(session: DialingSession): Promise<DialingSession>;

  /**
   * Find session by ID
   */
  findById(id: string): Promise<DialingSession | null>;

  /**
   * Find active session for campaign
   */
  findActiveByCampaign(campaignId: string): Promise<DialingSession | null>;

  /**
   * Find all sessions with optional filters
   */
  findAll(filters?: {
    campaignId?: string;
    status?: SessionStatus;
    organizationId?: string;
  }): Promise<DialingSession[]>;

  /**
   * Delete a session
   */
  delete(id: string): Promise<void>;

  /**
   * Check if session exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Check if campaign has active session
   */
  hasActiveSession(campaignId: string): Promise<boolean>;
}

/**
 * Token for dependency injection
 */
export const DIALING_SESSION_REPOSITORY_PORT = Symbol('DialingSessionRepositoryPort');
