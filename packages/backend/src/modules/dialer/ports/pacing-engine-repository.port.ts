/**
 * PacingEngine Repository Port (Hexagonal Architecture)
 * 
 * Interface for pacing engine data access
 * Implemented by TypeORM adapter
 */

import { PacingEngine } from '../domain/pacing-engine.domain';

export interface PacingEngineQueryOptions {
  campaignId?: string;
  sessionId?: string;
  organizationId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface PacingEngineRepositoryPort {
  /**
   * Create a new pacing engine
   */
  create(pacingEngine: PacingEngine): Promise<PacingEngine>;

  /**
   * Find pacing engine by ID
   */
  findById(id: string): Promise<PacingEngine | null>;

  /**
   * Find all pacing engines with optional filtering
   */
  findAll(options?: PacingEngineQueryOptions): Promise<PacingEngine[]>;

  /**
   * Find pacing engine by campaign ID
   */
  findByCampaignId(campaignId: string): Promise<PacingEngine | null>;

  /**
   * Find pacing engine by session ID
   */
  findBySessionId(sessionId: string): Promise<PacingEngine | null>;

  /**
   * Update pacing engine
   */
  update(id: string, pacingEngine: Partial<PacingEngine>): Promise<PacingEngine>;

  /**
   * Delete pacing engine
   */
  delete(id: string): Promise<void>;

  /**
   * Count pacing engines
   */
  count(options?: PacingEngineQueryOptions): Promise<number>;
}

export const PACING_ENGINE_REPOSITORY_PORT = Symbol('PACING_ENGINE_REPOSITORY_PORT');
