/**
 * PacingEngine Domain Model (Hexagonal Architecture)
 * 
 * Pure TypeScript - NO framework dependencies
 * Contains business logic and rules for pacing engine management
 */

import { PacingAlgorithm, PacingStatus } from '../../../entities/dialer/pacing-engine.entity';

export interface PacingCalculation {
  recommendedDialRate: number;
  overdialRatio: number;
  waitProbability: number;
  avgWaitTime: number;
  utilizationRate: number;
  calculatedAt: Date;
}

export interface PacingEngineProps {
  id?: string;
  campaignId?: string;
  sessionId?: string;
  organizationId?: string;
  algorithm: PacingAlgorithm;
  status: PacingStatus;
  targetAbandonmentRate: number;
  maxConcurrentCalls: number;
  linesPerAgent: number;
  dialTimeoutSeconds: number;
  minAgentsRequired: number;
  availableAgents: number;
  busyAgents: number;
  activeCalls: number;
  queuedCalls: number;
  avgAnswerTimeSeconds: number;
  avgCallDurationSeconds: number;
  contactRate: number;
  actualAbandonmentRate: number;
  pacingCalculation?: PacingCalculation;
  totalCallsDialed: number;
  totalCallsAnswered: number;
  totalCallsAbandoned: number;
  totalCallsConnected: number;
  customParameters?: Record<string, any>;
  startedAt?: Date;
  stoppedAt?: Date;
  lastCalculationAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * PacingEngine Domain Model
 * 
 * Business Rules:
 * 1. Cannot start if fewer agents than minAgentsRequired
 * 2. Abandonment rate must be between 0-100%
 * 3. Lines per agent must be >= 1
 * 4. Algorithm determines calculation method
 */
export class PacingEngine {
  private props: PacingEngineProps;

  constructor(props: PacingEngineProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  private validateProps(props: PacingEngineProps): void {
    if (props.targetAbandonmentRate < 0 || props.targetAbandonmentRate > 100) {
      throw new Error('Target abandonment rate must be between 0 and 100');
    }

    if (props.linesPerAgent < 1) {
      throw new Error('Lines per agent must be at least 1');
    }

    if (props.maxConcurrentCalls < 1) {
      throw new Error('Max concurrent calls must be at least 1');
    }

    if (props.dialTimeoutSeconds < 1) {
      throw new Error('Dial timeout must be at least 1 second');
    }

    if (props.minAgentsRequired < 1) {
      throw new Error('Minimum agents required must be at least 1');
    }
  }

  /**
   * Start the pacing engine
   */
  start(): void {
    if (this.props.status === PacingStatus.RUNNING) {
      throw new Error('Pacing engine is already running');
    }

    if (this.props.availableAgents < this.props.minAgentsRequired) {
      throw new Error(
        `Cannot start: requires ${this.props.minAgentsRequired} agents, only ${this.props.availableAgents} available`,
      );
    }

    this.props.status = PacingStatus.RUNNING;
    this.props.startedAt = new Date();
    this.props.stoppedAt = undefined;
  }

  /**
   * Pause the pacing engine
   */
  pause(): void {
    if (this.props.status !== PacingStatus.RUNNING) {
      throw new Error('Can only pause a running pacing engine');
    }

    this.props.status = PacingStatus.PAUSED;
  }

  /**
   * Resume the pacing engine
   */
  resume(): void {
    if (this.props.status !== PacingStatus.PAUSED) {
      throw new Error('Can only resume a paused pacing engine');
    }

    this.props.status = PacingStatus.RUNNING;
  }

  /**
   * Stop the pacing engine
   */
  stop(): void {
    if (this.props.status === PacingStatus.STOPPED) {
      throw new Error('Pacing engine is already stopped');
    }

    this.props.status = PacingStatus.STOPPED;
    this.props.stoppedAt = new Date();
  }

  /**
   * Update real-time metrics
   */
  updateMetrics(metrics: {
    availableAgents?: number;
    busyAgents?: number;
    activeCalls?: number;
    queuedCalls?: number;
    avgAnswerTimeSeconds?: number;
    avgCallDurationSeconds?: number;
    contactRate?: number;
    actualAbandonmentRate?: number;
  }): void {
    Object.assign(this.props, metrics);
    this.props.lastCalculationAt = new Date();
  }

  /**
   * Update pacing calculation results
   */
  updateCalculation(calculation: PacingCalculation): void {
    this.props.pacingCalculation = calculation;
    this.props.lastCalculationAt = new Date();
  }

  /**
   * Record call outcomes
   */
  recordCallOutcome(outcome: {
    dialed?: number;
    answered?: number;
    abandoned?: number;
    connected?: number;
  }): void {
    if (outcome.dialed) this.props.totalCallsDialed += outcome.dialed;
    if (outcome.answered) this.props.totalCallsAnswered += outcome.answered;
    if (outcome.abandoned) this.props.totalCallsAbandoned += outcome.abandoned;
    if (outcome.connected) this.props.totalCallsConnected += outcome.connected;

    // Recalculate actual abandonment rate
    if (this.props.totalCallsDialed > 0) {
      this.props.actualAbandonmentRate =
        this.props.totalCallsAbandoned / this.props.totalCallsDialed;
    }
  }

  /**
   * Check if pacing engine can dial
   */
  canDial(): boolean {
    if (this.props.status !== PacingStatus.RUNNING) {
      return false;
    }

    if (this.props.availableAgents < this.props.minAgentsRequired) {
      return false;
    }

    if (this.props.activeCalls >= this.props.maxConcurrentCalls) {
      return false;
    }

    return true;
  }

  // Getters
  get id(): string | undefined {
    return this.props.id;
  }

  get campaignId(): string | undefined {
    return this.props.campaignId;
  }

  get sessionId(): string | undefined {
    return this.props.sessionId;
  }

  get organizationId(): string | undefined {
    return this.props.organizationId;
  }

  get algorithm(): PacingAlgorithm {
    return this.props.algorithm;
  }

  get status(): PacingStatus {
    return this.props.status;
  }

  get targetAbandonmentRate(): number {
    return this.props.targetAbandonmentRate;
  }

  get maxConcurrentCalls(): number {
    return this.props.maxConcurrentCalls;
  }

  get linesPerAgent(): number {
    return this.props.linesPerAgent;
  }

  get availableAgents(): number {
    return this.props.availableAgents;
  }

  get activeCalls(): number {
    return this.props.activeCalls;
  }

  get actualAbandonmentRate(): number {
    return this.props.actualAbandonmentRate;
  }

  get pacingCalculation(): PacingCalculation | undefined {
    return this.props.pacingCalculation;
  }

  /**
   * Get all properties
   */
  toObject(): PacingEngineProps {
    return { ...this.props };
  }
}
