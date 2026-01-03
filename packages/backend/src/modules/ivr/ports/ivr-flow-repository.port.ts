/**
 * IVR Flow Repository Port (Domain Interface)
 * 
 * Uses domain types only - NO framework dependencies
 */

import { IVRFlow, IVRFlowStatus } from '../domain/ivr-flow.domain';

export interface IVRFlowRepositoryPort {
  /**
   * Create a new IVR flow
   */
  create(flow: IVRFlow): Promise<IVRFlow>;

  /**
   * Find flow by ID
   */
  findById(id: string): Promise<IVRFlow | null>;

  /**
   * Find flows by organization
   */
  findByOrganization(organizationId: string, status?: IVRFlowStatus): Promise<IVRFlow[]>;

  /**
   * Find active flow by name (for execution lookup)
   */
  findActiveByName(organizationId: string, name: string): Promise<IVRFlow | null>;

  /**
   * Update existing flow
   */
  update(flow: IVRFlow): Promise<IVRFlow>;

  /**
   * Delete flow (hard delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Check if flow name exists in organization
   */
  existsByName(organizationId: string, name: string, excludeId?: string): Promise<boolean>;

  /**
   * List all flows with pagination
   */
  list(options: {
    organizationId?: string;
    status?: IVRFlowStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ flows: IVRFlow[]; total: number }>;
}
