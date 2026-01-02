import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../domain/organization.domain';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../ports/organization-repository.port';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly orgRepository: OrganizationRepositoryPort,
  ) {}

  async execute(): Promise<Organization[]> {
    return this.orgRepository.findAll();
  }
}
