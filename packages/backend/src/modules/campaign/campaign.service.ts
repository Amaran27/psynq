import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignEntity, CampaignStatus } from '../../entities/campaign.entity';
import { CreateCampaignDto, UpdateCampaignDto, CampaignStatsDto } from '../../dtos/campaign.dto';
import { EventBusPort } from '../../ports/event-bus.port';

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepository: Repository<CampaignEntity>,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async createCampaign(dto: CreateCampaignDto): Promise<CampaignEntity> {
    const campaign = this.campaignRepository.create({
      ...dto,
      startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    // Publish event
    this.eventBus.publish({
      type: 'campaign.created',
      timestamp: new Date(),
      organizationId: dto.organizationId || '',
      payload: { campaignId: savedCampaign.id },
    });

    return savedCampaign;
  }

  async getCampaign(campaignId: string): Promise<CampaignEntity> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['organization'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    return campaign;
  }

  async listCampaigns(organizationId?: string, status?: CampaignStatus): Promise<CampaignEntity[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign');

    if (organizationId) {
      query.andWhere('campaign.organizationId = :organizationId', { organizationId });
    }

    if (status) {
      query.andWhere('campaign.status = :status', { status });
    }

    query.orderBy('campaign.createdAt', 'DESC');

    return query.getMany();
  }

  async updateCampaign(campaignId: string, dto: UpdateCampaignDto): Promise<CampaignEntity> {
    const campaign = await this.getCampaign(campaignId);

    // Prevent updating active campaigns
    if (campaign.status === CampaignStatus.ACTIVE && dto.dialMode) {
      throw new BadRequestException('Cannot change dial mode of active campaign');
    }

    Object.assign(campaign, {
      ...dto,
      startTime: dto.startTime ? new Date(dto.startTime) : campaign.startTime,
      endTime: dto.endTime ? new Date(dto.endTime) : campaign.endTime,
    });

    const updated = await this.campaignRepository.save(campaign);

    this.eventBus.publish({
      type: 'campaign.updated',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: { campaignId },
    });

    return updated;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const campaign = await this.getCampaign(campaignId);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active campaign. Pause it first.');
    }

    await this.campaignRepository.remove(campaign);

    this.eventBus.publish({
      type: 'campaign.deleted',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: { campaignId },
    });
  }

  async startCampaign(campaignId: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaign(campaignId);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is already active');
    }

    if (campaign.status === CampaignStatus.COMPLETED || campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Cannot start completed or cancelled campaign');
    }

    campaign.status = CampaignStatus.ACTIVE;
    campaign.startedAt = new Date();

    const updated = await this.campaignRepository.save(campaign);

    this.eventBus.publish({
      type: 'campaign.started',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: { campaignId },
    });

    return updated;
  }

  async pauseCampaign(campaignId: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaign(campaignId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Can only pause active campaigns');
    }

    campaign.status = CampaignStatus.PAUSED;

    const updated = await this.campaignRepository.save(campaign);

    this.eventBus.publish({
      type: 'campaign.paused',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: { campaignId },
    });

    return updated;
  }

  async stopCampaign(campaignId: string): Promise<CampaignEntity> {
    const campaign = await this.getCampaign(campaignId);

    if (campaign.status === CampaignStatus.COMPLETED || campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Campaign already stopped');
    }

    campaign.status = CampaignStatus.COMPLETED;
    campaign.completedAt = new Date();

    const updated = await this.campaignRepository.save(campaign);

    this.eventBus.publish({
      type: 'campaign.stopped',
      timestamp: new Date(),
      organizationId: campaign.organizationId || '',
      payload: { campaignId },
    });

    return updated;
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStatsDto> {
    const campaign = await this.getCampaign(campaignId);

    const pendingLeads = campaign.totalLeads - campaign.contactedLeads;
    const contactRate = campaign.totalLeads > 0 ? campaign.contactedLeads / campaign.totalLeads : 0;
    const successRate = campaign.contactedLeads > 0 ? campaign.successfulCalls / campaign.contactedLeads : 0;

    return {
      campaignId: campaign.id,
      totalLeads: campaign.totalLeads,
      contactedLeads: campaign.contactedLeads,
      pendingLeads,
      successfulCalls: campaign.successfulCalls,
      failedAttempts: campaign.failedAttempts,
      avgCallDurationSeconds: campaign.avgCallDurationSeconds,
      contactRate: Math.round(contactRate * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  async updateCampaignStats(campaignId: string, stats: Partial<CampaignEntity>): Promise<void> {
    await this.campaignRepository.update(campaignId, stats);
  }
}
