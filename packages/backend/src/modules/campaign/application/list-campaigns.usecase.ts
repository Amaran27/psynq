/**
 * List Campaigns Use Case
 * 
 * Hexagonal Architecture - Application layer
 */

import { Inject, Injectable } from '@nestjs/common';
import { Campaign, CampaignStatus } from '../domain/campaign.domain';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../ports/campaign-repository.port';

@Injectable()
export class ListCampaignsUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly repository: CampaignRepositoryPort,
  ) {}

  async execute(filters?: {
    organizationId?: string;
    status?: CampaignStatus;
  }): Promise<Campaign[]> {
    return this.repository.findAll(filters);
  }
}
