import { Organization } from '../domain/organization.domain';

export interface OrganizationRepositoryPort {
  save(organization: Organization): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  findByName(name: string): Promise<Organization | null>;
  findAll(): Promise<Organization[]>;
  delete(id: string): Promise<void>;
}

export const ORGANIZATION_REPOSITORY_PORT = Symbol(
  'OrganizationRepositoryPort',
);
