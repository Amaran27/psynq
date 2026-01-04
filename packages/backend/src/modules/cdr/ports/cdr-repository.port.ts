/**
 * CDR Repository Port
 */

import { CDR } from '../domain/cdr.entity';

export interface CDRSearchFilters {
  accountcode?: string;
  src?: string;
  dst?: string;
  disposition?: string;
  startDate?: Date;
  endDate?: Date;
  hasRecording?: boolean;
}

export interface CDRAnalytics {
  totalCalls: number;
  answeredCalls: number;
  failedCalls: number;
  totalDuration: number; // seconds
  totalBillsec: number; // seconds
  avgDuration: number; // seconds
  avgBillsec: number; // seconds
  answerRate: number; // percentage
}

export interface CDRRepositoryPort {
  /**
   * Find CDRs with filters and pagination
   */
  find(filters: CDRSearchFilters, limit?: number, offset?: number): Promise<CDR[]>;

  /**
   * Count CDRs matching filters
   */
  count(filters: CDRSearchFilters): Promise<number>;

  /**
   * Get CDR by unique ID
   */
  findByUniqueId(uniqueid: string): Promise<CDR | null>;

  /**
   * Get analytics for CDRs matching filters
   */
  getAnalytics(filters: CDRSearchFilters): Promise<CDRAnalytics>;
}
