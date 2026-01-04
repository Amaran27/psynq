/**
 * Scorecard Repository Port
 * 
 * Interface for scorecard persistence
 */

import { Scorecard } from '../scorecard.domain';

export interface ScorecardRepository {
  create(scorecard: Scorecard): Promise<Scorecard>;
  findById(id: string, organizationId: string): Promise<Scorecard | null>;
  findByOrganization(organizationId: string, filters?: { status?: string }): Promise<Scorecard[]>;
  update(scorecard: Scorecard): Promise<Scorecard>;
  delete(id: string, organizationId: string): Promise<void>;
  getStatistics(organizationId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    archived: number;
  }>;
}

export const SCORECARD_REPOSITORY = Symbol('SCORECARD_REPOSITORY');
