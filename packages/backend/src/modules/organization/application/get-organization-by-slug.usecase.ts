import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Organization } from '../domain/organization.domain';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../ports/organization-repository.port';

@Injectable()
export class GetOrganizationBySlugUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly orgRepository: OrganizationRepositoryPort,
  ) {}

  async execute(slug: string): Promise<Organization> {
    const org = await this.orgRepository.findBySlug(slug);
    if (!org) {
      throw new NotFoundException(`Organization with slug ${slug} not found`);
    }
    return org;
  }
}
