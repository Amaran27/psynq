/**
 * Create Campaign Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Pure business logic, no framework dependencies
 */

import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Campaign, CampaignType, CampaignStatus, DialMode } from '../domain/campaign.domain';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';

export interface CreateCampaignInput {
  name: string;
  description?: string;
  type: CampaignType;
  dialMode: DialMode;
  organizationId?: string;
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
export class CreateCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly repository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: CreateCampaignInput): Promise<Campaign> {
    // Create domain entity
    const campaign = new Campaign(
      randomUUID(),
      input.name,
      input.description,
      input.type,
      CampaignStatus.DRAFT,
      input.dialMode,
      input.organizationId,
      input.startTime,
      input.endTime,
      input.schedule,
      input.maxAttempts || 3,
      input.retryIntervalMinutes || 60,
      input.abandonmentRate,
      input.linesPerAgent,
      input.leadListId,
      {
        totalLeads: 0,
        contactedLeads: 0,
        successfulCalls: 0,
        failedAttempts: 0,
        avgCallDurationSeconds: 0,
      },
      new Date(),
      new Date(),
    );

    // Validate business rules
    campaign.validate();

    // Save
    const saved = await this.repository.save(campaign);

    // Publish event
    this.eventBus.publish({
      type: 'campaign.created',
      timestamp: new Date(),
      organizationId: input.organizationId || '',
      payload: { campaignId: saved.id },
    });

    return saved;
  }
}
