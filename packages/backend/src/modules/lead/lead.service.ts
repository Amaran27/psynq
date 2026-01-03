import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LeadEntity, LeadStatus } from '../../entities/lead.entity';
import { CreateLeadDto, UpdateLeadDto, ImportLeadsDto, UpdateLeadStatusDto } from '../../dtos/lead.dto';
import { EventBusPort } from '../../ports/event-bus.port';

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leadRepository: Repository<LeadEntity>,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async createLead(dto: CreateLeadDto): Promise<LeadEntity> {
    const lead = this.leadRepository.create(dto);
    const savedLead = await this.leadRepository.save(lead);

    this.eventBus.publish({
      type: 'lead.created',
      timestamp: new Date(),
      organizationId: dto.organizationId || '',
      payload: { leadId: savedLead.id, campaignId: dto.campaignId },
    });

    return savedLead;
  }

  async getLead(leadId: string): Promise<LeadEntity> {
    const lead = await this.leadRepository.findOne({
      where: { id: leadId },
      relations: ['organization', 'campaign'],
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    return lead;
  }

  async listLeads(
    organizationId?: string,
    campaignId?: string,
    status?: LeadStatus,
    assignedAgentId?: string,
  ): Promise<LeadEntity[]> {
    const query = this.leadRepository.createQueryBuilder('lead');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (campaignId) {
      query.andWhere('lead.campaignId = :campaignId', { campaignId });
    }

    if (status) {
      query.andWhere('lead.status = :status', { status });
    }

    if (assignedAgentId) {
      query.andWhere('lead.assignedAgentId = :assignedAgentId', { assignedAgentId });
    }

    query.orderBy('lead.priority', 'DESC').addOrderBy('lead.createdAt', 'ASC');

    return query.getMany();
  }

  async updateLead(leadId: string, dto: UpdateLeadDto): Promise<LeadEntity> {
    const lead = await this.getLead(leadId);

    Object.assign(lead, dto);

    const updated = await this.leadRepository.save(lead);

    this.eventBus.publish({
      type: 'lead.updated',
      timestamp: new Date(),
      organizationId: lead.organizationId || '',
      payload: { leadId },
    });

    return updated;
  }

  async deleteLead(leadId: string): Promise<void> {
    const lead = await this.getLead(leadId);
    await this.leadRepository.remove(lead);

    this.eventBus.publish({
      type: 'lead.deleted',
      timestamp: new Date(),
      organizationId: lead.organizationId || '',
      payload: { leadId },
    });
  }

  async updateLeadStatus(leadId: string, dto: UpdateLeadStatusDto): Promise<LeadEntity> {
    const lead = await this.getLead(leadId);

    lead.status = dto.status;
    if (dto.notes) {
      lead.notes = lead.notes ? `${lead.notes}\n${dto.notes}` : dto.notes;
    }

    if (dto.status === LeadStatus.CONVERTED) {
      lead.convertedAt = new Date();
    }

    const updated = await this.leadRepository.save(lead);

    this.eventBus.publish({
      type: 'lead.status_changed',
      timestamp: new Date(),
      organizationId: lead.organizationId || '',
      payload: { leadId, oldStatus: lead.status, newStatus: dto.status },
    });

    return updated;
  }

  async importLeads(dto: ImportLeadsDto): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;

    for (const leadDto of dto.leads) {
      try {
        const lead = this.leadRepository.create({
          ...leadDto,
          campaignId: dto.campaignId || leadDto.campaignId,
        });
        await this.leadRepository.save(lead);
        imported++;
      } catch (error) {
        failed++;
        console.error(`Failed to import lead: ${leadDto.phoneNumber}`, error);
      }
    }

    this.eventBus.publish({
      type: 'leads.imported',
      timestamp: new Date(),
      organizationId: dto.leads[0]?.organizationId || '',
      payload: { campaignId: dto.campaignId, imported, failed },
    });

    return { imported, failed };
  }

  async assignLeadToAgent(leadId: string, agentId: string): Promise<LeadEntity> {
    const lead = await this.getLead(leadId);
    lead.assignedAgentId = agentId;

    const updated = await this.leadRepository.save(lead);

    this.eventBus.publish({
      type: 'lead.assigned',
      timestamp: new Date(),
      organizationId: lead.organizationId || '',
      payload: { leadId, agentId },
    });

    return updated;
  }

  async recordAttempt(leadId: string, callId: string, duration: number, outcome: string, notes?: string): Promise<LeadEntity> {
    const lead = await this.getLead(leadId);

    lead.attemptCount += 1;
    lead.lastAttemptAt = new Date();

    if (!lead.callHistory) {
      lead.callHistory = [];
    }

    lead.callHistory.push({
      callId,
      timestamp: new Date(),
      duration,
      outcome,
      notes,
    });

    // Update status based on outcome
    if (outcome === 'answered') {
      lead.status = LeadStatus.CONTACTED;
    } else if (outcome === 'no_answer') {
      lead.status = LeadStatus.NO_ANSWER;
    } else if (outcome === 'busy') {
      lead.status = LeadStatus.BUSY;
    } else if (outcome === 'failed') {
      lead.status = LeadStatus.FAILED;
    }

    return this.leadRepository.save(lead);
  }
}
