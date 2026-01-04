import { RatePlan, RatePlanType, RatePlanStatus } from '../rate-plan.domain';

export const RATE_PLAN_REPOSITORY_PORT = 'RATE_PLAN_REPOSITORY_PORT';

export interface FindRatePlansFilter {
  organizationId?: string;
  type?: RatePlanType;
  status?: RatePlanStatus;
  isActive?: boolean;
}

export interface RatePlanRepository {
  create(ratePlan: RatePlan): Promise<RatePlan>;
  findById(id: string): Promise<RatePlan | null>;
  findAll(filter?: FindRatePlansFilter): Promise<RatePlan[]>;
  findByOrganization(organizationId: string): Promise<RatePlan[]>;
  findActive(organizationId: string): Promise<RatePlan[]>;
  update(ratePlan: RatePlan): Promise<RatePlan>;
  delete(id: string): Promise<void>;
  count(filter?: FindRatePlansFilter): Promise<number>;
}
