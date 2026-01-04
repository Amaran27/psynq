/**
 * Scorecard Service
 * 
 * Business logic for scorecard management
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SCORECARD_REPOSITORY, ScorecardRepository } from '../domain/ports/scorecard.repository';
import { Scorecard, ScorecardStatus } from '../domain/scorecard.domain';
import { CreateScorecardDto } from './dto/create-scorecard.dto';
import { UpdateScorecardDto } from './dto/update-scorecard.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ScorecardService {
  constructor(
    @Inject(SCORECARD_REPOSITORY)
    private readonly scorecardRepository: ScorecardRepository,
  ) {}

  async createScorecard(
    organizationId: string,
    dto: CreateScorecardDto,
  ): Promise<Scorecard> {
    // Map DTO criteria to domain criteria
    const domainCriteria = dto.criteria.map(c => ({
      ...c,
      type: c.type as any, // DTO and domain enums have same values
    }));

    const scorecard = new Scorecard(
      uuidv4(),
      organizationId,
      dto.name,
      dto.description || '',
      ScorecardStatus.DRAFT,
      domainCriteria,
      dto.passingScore,
      dto.useWeightedScoring,
      dto.metadata,
    );

    return await this.scorecardRepository.create(scorecard);
  }

  async findById(id: string, organizationId: string): Promise<Scorecard> {
    const scorecard = await this.scorecardRepository.findById(id, organizationId);
    if (!scorecard) {
      throw new NotFoundException(`Scorecard ${id} not found`);
    }
    return scorecard;
  }

  async findByOrganization(
    organizationId: string,
    status?: string,
  ): Promise<Scorecard[]> {
    return await this.scorecardRepository.findByOrganization(organizationId, { status });
  }

  async updateScorecard(
    id: string,
    organizationId: string,
    dto: UpdateScorecardDto,
  ): Promise<Scorecard> {
    const scorecard = await this.findById(id, organizationId);

    if (!scorecard.canBeModified()) {
      throw new BadRequestException('Only draft scorecards can be modified');
    }

    if (dto.name !== undefined || dto.description !== undefined || dto.passingScore !== undefined || dto.useWeightedScoring !== undefined) {
      scorecard.update({
        name: dto.name,
        description: dto.description,
        passingScore: dto.passingScore,
        useWeightedScoring: dto.useWeightedScoring,
      });
    }

    if (dto.criteria !== undefined) {
      const domainCriteria = dto.criteria.map(c => ({
        ...c,
        type: c.type as any, // DTO and domain enums have same values
      }));
      scorecard.criteria = domainCriteria;
    }

    if (dto.metadata !== undefined) {
      scorecard.updateMetadata(dto.metadata);
    }

    return await this.scorecardRepository.update(scorecard);
  }

  async activateScorecard(id: string, organizationId: string): Promise<Scorecard> {
    const scorecard = await this.findById(id, organizationId);
    scorecard.activate();
    return await this.scorecardRepository.update(scorecard);
  }

  async archiveScorecard(id: string, organizationId: string): Promise<Scorecard> {
    const scorecard = await this.findById(id, organizationId);
    scorecard.archive();
    return await this.scorecardRepository.update(scorecard);
  }

  async deleteScorecard(id: string, organizationId: string): Promise<void> {
    const scorecard = await this.findById(id, organizationId);
    
    if (scorecard.status === ScorecardStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active scorecard. Archive it first.');
    }

    await this.scorecardRepository.delete(id, organizationId);
  }

  async getStatistics(organizationId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    archived: number;
  }> {
    return await this.scorecardRepository.getStatistics(organizationId);
  }
}
