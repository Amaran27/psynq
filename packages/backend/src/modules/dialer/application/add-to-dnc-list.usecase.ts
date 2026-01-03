/**
 * Add To DNC List Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Adds a phone number to the Do Not Call list
 */

import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DNCEntry, DNCSource, DNCStatus } from '../domain/dnc.domain';
import { DNCRepositoryPort, DNC_REPOSITORY_PORT } from '../ports/dnc-repository.port';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';
import { EventBusPort } from '../../../ports/event-bus.port';
import { randomUUID } from 'crypto';

export interface AddToDNCInput {
  phoneNumber: string;
  organizationId?: string;
  source: DNCSource;
  reason?: string;
  addedBy?: string;
  expiresAt?: Date;
}

@Injectable()
export class AddToDNCListUseCase {
  constructor(
    @Inject(DNC_REPOSITORY_PORT)
    private readonly dncRepository: DNCRepositoryPort,
    @Inject(LEAD_REPOSITORY_PORT)
    private readonly leadRepository: LeadRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: AddToDNCInput): Promise<DNCEntry> {
    // Normalize phone number
    const normalized = DNCEntry.normalizePhoneNumber(input.phoneNumber);

    // Check if already on DNC list
    const existing = await this.dncRepository.findByPhoneNumber(normalized, input.organizationId);
    if (existing && existing.isActive()) {
      throw new BadRequestException('Phone number is already on DNC list');
    }

    // Create DNC entry
    const entry = new DNCEntry(
      randomUUID(),
      normalized,
      input.source,
      DNCStatus.ACTIVE,
      input.organizationId,
      {
        reason: input.reason,
        addedBy: input.addedBy,
        requestDate: new Date(),
        expirationDate: input.expiresAt,
      },
      new Date(),
      new Date(),
      input.expiresAt,
    );

    // Validate
    entry.validate();

    // Save
    const saved = await this.dncRepository.save(entry);

    // Mark all leads with this number as DNC
    // This is a business rule: once added to DNC, all leads must be marked
    const leads = await this.leadRepository.findAll();
    const affectedLeads = leads.filter(l => l.phoneNumber === normalized);
    
    for (const lead of affectedLeads) {
      lead.addToDNC();
      await this.leadRepository.save(lead);
    }

    // Publish event
    this.eventBus.publish({
      type: 'dnc.phone_added',
      timestamp: new Date(),
      organizationId: input.organizationId || '',
      payload: {
        phoneNumber: normalized,
        source: input.source,
        affectedLeads: affectedLeads.length,
      },
    });

    return saved;
  }
}
