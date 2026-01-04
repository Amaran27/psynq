/**
 * IVR Flow Repository Port
 */

import { IVRFlow } from '../ivr-flow.domain';

export interface FlowFilters {
  status?: string;
  search?: string;
}

export interface IVRFlowRepository {
  create(flow: IVRFlow): Promise<IVRFlow>;
  findById(id: string, organizationId: string): Promise<IVRFlow | null>;
  findByOrganization(organizationId: string, filters?: FlowFilters): Promise<IVRFlow[]>;
  update(flow: IVRFlow): Promise<IVRFlow>;
  delete(id: string, organizationId: string): Promise<void>;
  getStatistics(organizationId: string): Promise<{
    total: number;
    draft: number;
    published: number;
    archived: number;
  }>;
}

export const IVR_FLOW_REPOSITORY = Symbol('IVR_FLOW_REPOSITORY');
