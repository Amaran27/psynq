/**
 * Get Campaign Use Case
 * 
 * Hexagonal Architecture - Application layer
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Campaign } from '../domain/campaign.domain';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../ports/campaign-repository.port';

@Injectable()
export class GetCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly repository: CampaignRepositoryPort,
  ) {}

  async execute(id: string): Promise<Campaign> {
    const campaign = await this.repository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return campaign;
  }
}
