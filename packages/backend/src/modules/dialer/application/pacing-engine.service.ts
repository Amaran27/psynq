/**
 * PacingEngine Service (Hexagonal Architecture)
 * 
 * Application layer service for managing pacing engines
 * Uses repository port for data access
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PacingEngineRepositoryPort, PACING_ENGINE_REPOSITORY_PORT } from '../ports/pacing-engine-repository.port';
import { PacingEngine } from '../domain/pacing-engine.domain';
import { CreatePacingEngineDto } from '../dto/create-pacing-engine.dto';
import { UpdatePacingEngineDto } from '../dto/update-pacing-engine.dto';
import { PacingAlgorithm, PacingStatus } from '../../../entities/dialer/pacing-engine.entity';

export interface PacingEngineListQuery {
  campaignId?: string;
  sessionId?: string;
  organizationId?: string;
  status?: PacingStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class PacingEngineService {
  constructor(
    @Inject(PACING_ENGINE_REPOSITORY_PORT)
    private readonly repository: PacingEngineRepositoryPort,
  ) {}

  /**
   * Create a new pacing engine
   */
  async create(dto: CreatePacingEngineDto): Promise<PacingEngine> {
    const pacingEngine = new PacingEngine({
      campaignId: dto.campaignId,
      sessionId: dto.sessionId,
      organizationId: dto.organizationId,
      algorithm: dto.algorithm || PacingAlgorithm.ERLANG_C,
      status: PacingStatus.IDLE,
      targetAbandonmentRate: dto.targetAbandonmentRate,
      maxConcurrentCalls: dto.maxConcurrentCalls,
      linesPerAgent: dto.linesPerAgent,
      dialTimeoutSeconds: dto.dialTimeoutSeconds,
      minAgentsRequired: dto.minAgentsRequired,
      availableAgents: 0,
      busyAgents: 0,
      activeCalls: 0,
      queuedCalls: 0,
      avgAnswerTimeSeconds: 0,
      avgCallDurationSeconds: 0,
      contactRate: 0.5,
      actualAbandonmentRate: 0,
      totalCallsDialed: 0,
      totalCallsAnswered: 0,
      totalCallsAbandoned: 0,
      totalCallsConnected: 0,
      customParameters: dto.customParameters,
    });

    return await this.repository.create(pacingEngine);
  }

  /**
   * Find pacing engine by ID
   */
  async findOne(id: string): Promise<PacingEngine> {
    const pacingEngine = await this.repository.findById(id);
    if (!pacingEngine) {
      throw new NotFoundException(`PacingEngine with ID ${id} not found`);
    }
    return pacingEngine;
  }

  /**
   * Find all pacing engines with optional filtering
   */
  async findAll(query: PacingEngineListQuery): Promise<PacingEngine[]> {
    return await this.repository.findAll(query);
  }

  /**
   * Find pacing engine by campaign ID
   */
  async findByCampaign(campaignId: string): Promise<PacingEngine | null> {
    return await this.repository.findByCampaignId(campaignId);
  }

  /**
   * Find pacing engine by session ID
   */
  async findBySession(sessionId: string): Promise<PacingEngine | null> {
    return await this.repository.findBySessionId(sessionId);
  }

  /**
   * Update pacing engine
   */
  async update(id: string, dto: UpdatePacingEngineDto): Promise<PacingEngine> {
    const existing = await this.findOne(id);

    // Create updated domain object
    const updated = new PacingEngine({
      ...existing.toObject(),
      ...dto,
    });

    return await this.repository.update(id, updated);
  }

  /**
   * Delete pacing engine
   */
  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    
    if (existing.status === PacingStatus.RUNNING) {
      throw new BadRequestException('Cannot delete a running pacing engine. Stop it first.');
    }

    await this.repository.delete(id);
  }

  /**
   * Start pacing engine
   */
  async start(id: string): Promise<PacingEngine> {
    const pacingEngine = await this.findOne(id);
    pacingEngine.start(); // Domain logic validates business rules
    return await this.repository.update(id, pacingEngine);
  }

  /**
   * Pause pacing engine
   */
  async pause(id: string): Promise<PacingEngine> {
    const pacingEngine = await this.findOne(id);
    pacingEngine.pause();
    return await this.repository.update(id, pacingEngine);
  }

  /**
   * Resume pacing engine
   */
  async resume(id: string): Promise<PacingEngine> {
    const pacingEngine = await this.findOne(id);
    pacingEngine.resume();
    return await this.repository.update(id, pacingEngine);
  }

  /**
   * Stop pacing engine
   */
  async stop(id: string): Promise<PacingEngine> {
    const pacingEngine = await this.findOne(id);
    pacingEngine.stop();
    return await this.repository.update(id, pacingEngine);
  }

  /**
   * Update real-time metrics
   */
  async updateMetrics(
    id: string,
    metrics: {
      availableAgents?: number;
      busyAgents?: number;
      activeCalls?: number;
      queuedCalls?: number;
      avgAnswerTimeSeconds?: number;
      avgCallDurationSeconds?: number;
      contactRate?: number;
      actualAbandonmentRate?: number;
    },
  ): Promise<PacingEngine> {
    const pacingEngine = await this.findOne(id);
    pacingEngine.updateMetrics(metrics);
    return await this.repository.update(id, pacingEngine);
  }

  /**
   * Record call outcomes
   */
  async recordCallOutcome(
    id: string,
    outcome: {
      dialed?: number;
      answered?: number;
      abandoned?: number;
      connected?: number;
    },
  ): Promise<PacingEngine> {
    const pacingEngine = await this.findOne(id);
    pacingEngine.recordCallOutcome(outcome);
    return await this.repository.update(id, pacingEngine);
  }

  /**
   * Get statistics
   */
  async getStatistics(query: PacingEngineListQuery): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byAlgorithm: Record<string, number>;
  }> {
    const total = await this.repository.count(query);
    
    // Get counts by status
    const byStatus: Record<string, number> = {};
    for (const status of Object.values(PacingStatus)) {
      byStatus[status] = await this.repository.count({ ...query, status });
    }

    // Get counts by algorithm
    const all = await this.repository.findAll(query);
    const byAlgorithm: Record<string, number> = {};
    for (const pe of all) {
      const algo = pe.algorithm;
      byAlgorithm[algo] = (byAlgorithm[algo] || 0) + 1;
    }

    return { total, byStatus, byAlgorithm };
  }
}
