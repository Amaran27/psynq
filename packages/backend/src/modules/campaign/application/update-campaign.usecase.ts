/**
 * Update Campaign Use Case
 * 
 * Hexagonal Architecture - Application layer
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Campaign, DialMode } from '../domain/campaign.domain';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  dialMode?: DialMode;
  startTime?: Date;
  endTime?: Date;
  schedule?: any;
  maxAttempts?: number;
  retryIntervalMinutes?: number;
  abandonmentRate?: number;
  linesPerAgent?: number;
  leadListId?: string;
}

@Injectable()
export class UpdateCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly repository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    const campaign = await this.repository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    // Apply updates with business logic validation
    if (input.name !== undefined) campaign.name = input.name;
    if (input.description !== undefined) campaign.description = input.description;
    if (input.startTime !== undefined) campaign.startTime = input.startTime;
    if (input.endTime !== undefined) campaign.endTime = input.endTime;
    if (input.schedule !== undefined) campaign.schedule = input.schedule;
    if (input.maxAttempts !== undefined) campaign.maxAttempts = input.maxAttempts;
    if (input.retryIntervalMinutes !== undefined) campaign.retryIntervalMinutes = input.retryIntervalMinutes;
    if (input.abandonmentRate !== undefined) campaign.abandonmentRate = input.abandonmentRate;
    if (input.linesPerAgent !== undefined) campaign.linesPerAgent = input.linesPerAgent;
    if (input.leadListId !== undefined) campaign.leadListId = input.leadListId;

    // Dial mode has business rules
    if (input.dialMode !== undefined) {
      campaign.updateDialMode(input.dialMode); // Validates via domain logic
    }

    // Validate all changes
    campaign.validate();

    // Save
    const updated = await this.repository.save(campaign);

    // Publish event
    this.eventBus.publish({
      type: 'campaign.updated',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: { campaignId: id },
    });

    return updated;
  }
}
