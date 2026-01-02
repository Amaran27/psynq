import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Organization } from '../domain/organization.domain';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../ports/organization-repository.port';

@Injectable()
export class GetOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly orgRepository: OrganizationRepositoryPort,
  ) {}

  async execute(id: string): Promise<Organization> {
    const org = await this.orgRepository.findById(id);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return org;
  }
}
