/**
 * Campaign Repository Port (Interface)
 * 
 * Hexagonal Architecture - Port defines what the domain needs
 * Adapters implement how to fulfill those needs
 */

import { Campaign, CampaignStatus } from '../domain/campaign.domain';

export interface CampaignRepositoryPort {
  /**
   * Save a campaign (create or update)
   */
  save(campaign: Campaign): Promise<Campaign>;

  /**
   * Find campaign by ID
   */
  findById(id: string): Promise<Campaign | null>;

  /**
   * Find all campaigns with optional filters
   */
  findAll(filters?: {
    organizationId?: string;
    status?: CampaignStatus;
  }): Promise<Campaign[]>;

  /**
   * Delete a campaign
   */
  delete(id: string): Promise<void>;

  /**
   * Check if campaign exists
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Token for dependency injection
 */
export const CAMPAIGN_REPOSITORY_PORT = Symbol('CampaignRepositoryPort');
