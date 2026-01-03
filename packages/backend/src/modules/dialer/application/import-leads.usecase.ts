/**
 * Import Leads Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Imports leads from CSV data into a campaign
 */

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Lead, LeadStatus } from '../domain/lead.domain';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';
import { CampaignRepositoryPort, CAMPAIGN_REPOSITORY_PORT } from '../../campaign/ports/campaign-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';
import { randomUUID } from 'crypto';

export interface LeadImportData {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  priority?: number;
  timezone?: string;
  customData?: Record<string, any>;
}

export interface ImportLeadsInput {
  campaignId: string;
  leads: LeadImportData[];
  skipDuplicates?: boolean;
}

@Injectable()
export class ImportLeadsUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT)
    private readonly leadRepository: LeadRepositoryPort,
    @Inject(CAMPAIGN_REPOSITORY_PORT)
    private readonly campaignRepository: CampaignRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: ImportLeadsInput): Promise<{ imported: number; skipped: number; errors: string[] }> {
    // Validate campaign exists
    const campaign = await this.campaignRepository.findById(input.campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${input.campaignId} not found`);
    }

    if (input.leads.length === 0) {
      throw new BadRequestException('No leads provided');
    }

    const leadsToSave: Lead[] = [];
    const errors: string[] = [];
    let skipped = 0;

    for (const leadData of input.leads) {
      try {
        // Check if lead already exists
        if (input.skipDuplicates) {
          const existing = await this.leadRepository.findByPhoneAndCampaign(
            leadData.phoneNumber,
            input.campaignId,
          );
          if (existing) {
            skipped++;
            continue;
          }
        }

        // Create lead domain object
        const lead = new Lead(
          randomUUID(),
          input.campaignId,
          leadData.phoneNumber,
          leadData.firstName,
          leadData.lastName,
          leadData.email,
          LeadStatus.NEW,
          leadData.priority ?? 5,
          leadData.timezone,
          leadData.customData ?? {},
          [],
          undefined,
          undefined,
          undefined,
          new Date(),
          new Date(),
        );

        // Validate
        lead.validate();

        leadsToSave.push(lead);
      } catch (error) {
        errors.push(`Failed to import ${leadData.phoneNumber}: ${error.message}`);
      }
    }

    // Save all leads
    if (leadsToSave.length > 0) {
      await this.leadRepository.saveMany(leadsToSave);
    }

    // Update campaign total leads count
    campaign.stats.totalLeads += leadsToSave.length;
    await this.campaignRepository.save(campaign);

    // Publish event
    this.eventBus.publish({
      type: 'leads.imported',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: {
        campaignId: input.campaignId,
        imported: leadsToSave.length,
        skipped,
        errors: errors.length,
      },
    });

    return {
      imported: leadsToSave.length,
      skipped,
      errors,
    };
  }
}
