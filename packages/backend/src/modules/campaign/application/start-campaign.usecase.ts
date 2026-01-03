/**
 * Start Campaign Use Case
 * 
 * Hexagonal Architecture - Application layer
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Campaign } from '../domain/campaign.domain';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';

@Injectable()
export class StartCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly repository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(id: string): Promise<Campaign> {
    const campaign = await this.repository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    // Domain logic handles validation
    campaign.start();

    // Save
    const updated = await this.repository.save(campaign);

    // Publish event
    this.eventBus.publish({
      type: 'campaign.started',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: { campaignId: id },
    });

    return updated;
  }
}
