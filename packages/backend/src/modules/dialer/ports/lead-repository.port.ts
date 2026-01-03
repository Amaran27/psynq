/**
 * Lead Repository Port (Interface)
 * 
 * Hexagonal Architecture - Port defines what the domain needs
 * Adapters implement how to fulfill those needs
 */

import { Lead, LeadStatus } from '../domain/lead.domain';

export interface LeadRepositoryPort {
  /**
   * Save a lead (create or update)
   */
  save(lead: Lead): Promise<Lead>;

  /**
   * Save multiple leads (bulk insert)
   */
  saveMany(leads: Lead[]): Promise<Lead[]>;

  /**
   * Find lead by ID
   */
  findById(id: string): Promise<Lead | null>;

  /**
   * Find lead by phone number and campaign
   */
  findByPhoneAndCampaign(phoneNumber: string, campaignId: string): Promise<Lead | null>;

  /**
   * Find all leads with optional filters
   */
  findAll(filters?: {
    campaignId?: string;
    status?: LeadStatus;
    assignedAgentId?: string;
  }): Promise<Lead[]>;

  /**
   * Find dialable leads for a campaign
   */
  findDialableLeads(
    campaignId: string,
    maxAttempts: number,
    limit: number,
  ): Promise<Lead[]>;

  /**
   * Find next lead for agent (preview mode)
   */
  findNextLeadForAgent(
    campaignId: string,
    agentId: string,
    maxAttempts: number,
  ): Promise<Lead | null>;

  /**
   * Count leads by status
   */
  countByStatus(campaignId: string, status: LeadStatus): Promise<number>;

  /**
   * Delete a lead
   */
  delete(id: string): Promise<void>;

  /**
   * Delete leads by campaign
   */
  deleteByCampaign(campaignId: string): Promise<void>;

  /**
   * Check if lead exists
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Token for dependency injection
 */
export const LEAD_REPOSITORY_PORT = Symbol('LeadRepositoryPort');
