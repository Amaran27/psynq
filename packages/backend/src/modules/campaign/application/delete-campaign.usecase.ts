/**
 * Delete Campaign Use Case
 * 
 * Hexagonal Architecture - Application layer
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';

@Injectable()
export class DeleteCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly repository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(id: string): Promise<void> {
    const campaign = await this.repository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    // Validate business rules via domain logic
    campaign.validateDeletion(); // Throws if active

    // Delete
    await this.repository.delete(id);

    // Publish event
    this.eventBus.publish({
      type: 'campaign.deleted',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: { campaignId: id },
    });
  }
}
