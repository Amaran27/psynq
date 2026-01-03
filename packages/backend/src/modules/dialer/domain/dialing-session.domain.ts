/**
 * DialingSession Domain Entity (Hexagonal Architecture)
 * 
 * Pure TypeScript - NO framework dependencies
 * Contains business logic and domain rules
 */

export enum DialingMode {
  PREVIEW = 'preview',
  PROGRESSIVE = 'progressive',
  PREDICTIVE = 'predictive',
  POWER = 'power',
}

export enum SessionStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface SessionStats {
  leadsProcessed: number;
  callsAttempted: number;
  callsAnswered: number;
  callsAbandoned: number;
  avgWaitTimeSeconds: number;
  avgTalkTimeSeconds: number;
  conversionRate: number;
}

export interface PacingConfig {
  linesPerAgent: number; // For predictive/power
  targetAbandonmentRate: number; // For predictive
  maxConcurrentCalls: number;
  dialTimeoutSeconds: number;
}

/**
 * Domain Exception for DialingSession business rule violations
 */
export class DialingSessionDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DialingSessionDomainException';
  }
}

/**
 * DialingSession Domain Entity
 * 
 * Represents an active dialing campaign session
 * Manages dialing pacing, agent assignment, and statistics
 */
export class DialingSession {
  constructor(
    public readonly id: string,
    public campaignId: string,
    public mode: DialingMode,
    public status: SessionStatus,
    public organizationId: string | undefined,
    public pacingConfig: PacingConfig,
    public stats: SessionStats,
    public activeAgentIds: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public startedAt: Date | undefined = undefined,
    public completedAt: Date | undefined = undefined,
  ) {}

  /**
   * Business Rule: Start session
   */
  start(): void {
    if (this.status === SessionStatus.ACTIVE) {
      throw new DialingSessionDomainException('Session is already active');
    }
    if (this.status === SessionStatus.COMPLETED) {
      throw new DialingSessionDomainException('Cannot restart completed session');
    }
    if (this.activeAgentIds.length === 0) {
      throw new DialingSessionDomainException('Cannot start session without agents');
    }

    this.status = SessionStatus.ACTIVE;
    this.startedAt = new Date();
  }

  /**
   * Business Rule: Pause session
   */
  pause(): void {
    if (this.status !== SessionStatus.ACTIVE) {
      throw new DialingSessionDomainException('Can only pause active session');
    }
    this.status = SessionStatus.PAUSED;
  }

  /**
   * Business Rule: Resume session
   */
  resume(): void {
    if (this.status !== SessionStatus.PAUSED) {
      throw new DialingSessionDomainException('Can only resume paused session');
    }
    this.status = SessionStatus.ACTIVE;
  }

  /**
   * Business Rule: Complete session
   */
  complete(): void {
    if (this.status !== SessionStatus.ACTIVE && this.status !== SessionStatus.PAUSED) {
      throw new DialingSessionDomainException('Can only complete active or paused session');
    }
    this.status = SessionStatus.COMPLETED;
    this.completedAt = new Date();
  }

  /**
   * Business Rule: Fail session
   */
  fail(reason: string): void {
    this.status = SessionStatus.FAILED;
  }

  /**
   * Business Rule: Add agent to session
   */
  addAgent(agentId: string): void {
    if (this.status === SessionStatus.COMPLETED) {
      throw new DialingSessionDomainException('Cannot add agent to completed session');
    }
    if (this.activeAgentIds.includes(agentId)) {
      throw new DialingSessionDomainException('Agent already in session');
    }

    this.activeAgentIds.push(agentId);
  }

  /**
   * Business Rule: Remove agent from session
   */
  removeAgent(agentId: string): void {
    const index = this.activeAgentIds.indexOf(agentId);
    if (index === -1) {
      throw new DialingSessionDomainException('Agent not in session');
    }

    this.activeAgentIds.splice(index, 1);
  }

  /**
   * Business Rule: Calculate lines to dial (Predictive pacing)
   */
  calculateLinesToDial(): number {
    if (this.status !== SessionStatus.ACTIVE) return 0;
    if (this.activeAgentIds.length === 0) return 0;

    switch (this.mode) {
      case DialingMode.PREVIEW:
        return 0; // Agent-initiated
      
      case DialingMode.PROGRESSIVE:
        return this.activeAgentIds.length; // 1:1 ratio
      
      case DialingMode.POWER:
        return this.activeAgentIds.length * this.pacingConfig.linesPerAgent;
      
      case DialingMode.PREDICTIVE:
        return this.calculatePredictivePacing();
      
      default:
        return 0;
    }
  }

  /**
   * Business Rule: Predictive pacing algorithm
   */
  private calculatePredictivePacing(): number {
    const availableAgents = this.activeAgentIds.length;
    if (availableAgents === 0) return 0;

    // Simple predictive algorithm
    // More sophisticated versions would use machine learning
    const baseLines = availableAgents * this.pacingConfig.linesPerAgent;
    
    // Adjust based on current abandonment rate
    const currentAbandonmentRate = this.getCurrentAbandonmentRate();
    const targetRate = this.pacingConfig.targetAbandonmentRate;
    
    if (currentAbandonmentRate < targetRate * 0.8) {
      // Under target, increase pacing
      return Math.min(baseLines + 1, this.pacingConfig.maxConcurrentCalls);
    } else if (currentAbandonmentRate > targetRate * 1.2) {
      // Over target, decrease pacing
      return Math.max(baseLines - 1, availableAgents);
    }
    
    return Math.min(baseLines, this.pacingConfig.maxConcurrentCalls);
  }

  /**
   * Get current abandonment rate
   */
  private getCurrentAbandonmentRate(): number {
    const totalCalls = this.stats.callsAttempted;
    if (totalCalls === 0) return 0;
    
    return this.stats.callsAbandoned / totalCalls;
  }

  /**
   * Business Rule: Record call attempt
   */
  recordCallAttempt(): void {
    this.stats.callsAttempted++;
    this.stats.leadsProcessed++;
  }

  /**
   * Business Rule: Record answered call
   */
  recordCallAnswered(talkTimeSeconds: number): void {
    this.stats.callsAnswered++;
    
    // Update average talk time
    const totalAnswered = this.stats.callsAnswered;
    const currentAvg = this.stats.avgTalkTimeSeconds;
    this.stats.avgTalkTimeSeconds = 
      ((currentAvg * (totalAnswered - 1)) + talkTimeSeconds) / totalAnswered;
  }

  /**
   * Business Rule: Record abandoned call
   */
  recordCallAbandoned(waitTimeSeconds: number): void {
    this.stats.callsAbandoned++;
    
    // Update average wait time
    const totalAbandoned = this.stats.callsAbandoned;
    const currentAvg = this.stats.avgWaitTimeSeconds;
    this.stats.avgWaitTimeSeconds = 
      ((currentAvg * (totalAbandoned - 1)) + waitTimeSeconds) / totalAbandoned;
  }

  /**
   * Business Rule: Update conversion rate
   */
  updateConversionRate(conversions: number): void {
    const contacted = this.stats.callsAnswered;
    if (contacted === 0) {
      this.stats.conversionRate = 0;
      return;
    }
    
    this.stats.conversionRate = conversions / contacted;
  }

  /**
   * Check if session is dialable
   */
  isDialable(): boolean {
    return this.status === SessionStatus.ACTIVE && this.activeAgentIds.length > 0;
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.activeAgentIds.length;
  }

  /**
   * Validation: Check if session is valid
   */
  validate(): void {
    if (!this.campaignId) {
      throw new DialingSessionDomainException('Campaign ID is required');
    }

    if (this.pacingConfig.linesPerAgent < 1) {
      throw new DialingSessionDomainException('Lines per agent must be at least 1');
    }

    if (this.pacingConfig.targetAbandonmentRate < 0 || this.pacingConfig.targetAbandonmentRate > 1) {
      throw new DialingSessionDomainException('Target abandonment rate must be between 0 and 1');
    }

    if (this.pacingConfig.maxConcurrentCalls < 1) {
      throw new DialingSessionDomainException('Max concurrent calls must be at least 1');
    }

    if (this.pacingConfig.dialTimeoutSeconds < 10) {
      throw new DialingSessionDomainException('Dial timeout must be at least 10 seconds');
    }
  }
}
