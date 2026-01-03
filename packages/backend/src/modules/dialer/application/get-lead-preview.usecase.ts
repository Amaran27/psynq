/**
 * Get Lead Preview Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Gets lead details for agent to preview before dialing
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Lead } from '../domain/lead.domain';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';

@Injectable()
export class GetLeadPreviewUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT)
    private readonly leadRepository: LeadRepositoryPort,
  ) {}

  async execute(leadId: string): Promise<Lead> {
    const lead = await this.leadRepository.findById(leadId);
    
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    return lead;
  }
}
