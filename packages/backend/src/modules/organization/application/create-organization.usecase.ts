import { Injectable, Inject, ConflictException } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../ports/organization-repository.port';
import { Organization } from '../domain/organization.domain';
import { randomUUID } from 'crypto';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly orgRepository: OrganizationRepositoryPort,
  ) {}

  async execute(name: string, slug: string): Promise<Organization> {
    const existingByName = await this.orgRepository.findByName(name);
    const existingBySlug = await this.orgRepository.findBySlug(slug);

    if (existingByName || existingBySlug) {
      throw new ConflictException('Organization name or slug already exists');
    }

    const org = new Organization(randomUUID(), name, slug);
    return this.orgRepository.save(org);
  }
}
