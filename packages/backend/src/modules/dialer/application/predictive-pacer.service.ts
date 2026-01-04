/**
 * Predictive Pacing Algorithm Service
 * 
 * Hexagonal Architecture - Application layer
 * Calculates optimal dialing pace to maximize agent talk time while minimizing abandonment
 * 
 * Algorithm:
 * 1. Tracks recent call outcomes (answered vs abandoned)
 * 2. Adjusts lines-to-agent ratio based on abandonment rate
 * 3. Increases pace when abandonment < target
 * 4. Decreases pace when abandonment > target
 * 5. Considers agent availability and call duration statistics
 */

import { Injectable, Logger } from '@nestjs/common';
import { PacingConfig, SessionStats } from '../domain/dialing-session.domain';

export interface PacingDecision {
  shouldDial: boolean;
  linesPerAgent: number;
  recommendedCalls: number;
  reason: string;
}

export interface CallMetrics {
  totalCalls: number;
  answeredCalls: number;
  abandonedCalls: number;
  avgHandleTimeSeconds: number;
  activeAgents: number;
  availableAgents: number;
  callsInProgress: number;
}

/**
 * Predictive Pacing Algorithm
 * 
 * Core principles:
 * - Target abandonment rate typically 3-5%
 * - Increase pace when below target
 * - Decrease pace when above target
 * - Never exceed max concurrent calls
 * - Respect agent availability
 */
@Injectable()
export class PredictivePacerService {
  private readonly logger = new Logger(PredictivePacerService.name);

  /**
   * Calculate optimal pacing based on current metrics
   */
  calculatePacing(
    metrics: CallMetrics,
    config: PacingConfig,
    stats: SessionStats,
  ): PacingDecision {
    const abandonmentRate = this.calculateAbandonmentRate(metrics);
    const targetAbandonmentRate = config.targetAbandonmentRate || 0.03; // Default 3%

    // Base lines per agent on current abandonment rate
    let linesPerAgent = this.calculateLinesPerAgent(
      abandonmentRate,
      targetAbandonmentRate,
      config.linesPerAgent,
    );

    // Calculate how many calls to launch now
    const recommendedCalls = this.calculateRecommendedCalls(
      metrics,
      linesPerAgent,
      config.maxConcurrentCalls,
    );

    const shouldDial = recommendedCalls > 0;

    let reason = '';
    if (!shouldDial) {
      reason = this.getNoDialReason(metrics, config);
    } else {
      reason = `Abandonment: ${(abandonmentRate * 100).toFixed(1)}%, Target: ${(targetAbandonmentRate * 100).toFixed(1)}%, Lines/Agent: ${linesPerAgent}, Calls: ${recommendedCalls}`;
    }

    this.logger.debug(`Pacing decision: ${reason}`);

    return {
      shouldDial,
      linesPerAgent,
      recommendedCalls,
      reason,
    };
  }

  /**
   * Calculate current abandonment rate
   */
  private calculateAbandonmentRate(metrics: CallMetrics): number {
    if (metrics.totalCalls === 0) return 0;
    return metrics.abandonedCalls / metrics.totalCalls;
  }

  /**
   * Calculate optimal lines per agent ratio
   * 
   * Logic:
   * - If abandonment < target: increase ratio (pilot more calls)
   * - If abandonment > target: decrease ratio (pilot fewer calls)
   * - If abandonment ~ target: maintain current ratio
   */
  private calculateLinesPerAgent(
    currentAbandonment: number,
    targetAbandonment: number,
    currentLinesPerAgent: number,
  ): number {
    const tolerance = 0.01; // 1% tolerance
    const difference = currentAbandonment - targetAbandonment;

    // If within tolerance, maintain current pace
    if (Math.abs(difference) <= tolerance) {
      return currentLinesPerAgent;
    }

    // If abandonment too high, decrease pace
    if (difference > 0) {
      // Abandonment exceeds target - slow down
      const decreaseFactor = 1 - (difference / targetAbandonment) * 0.5; // Conservative decrease
      return Math.max(1, Math.floor(currentLinesPerAgent * decreaseFactor));
    }

    // If abandonment too low, increase pace
    if (difference < 0) {
      // Abandonment below target - speed up
      const increaseFactor = 1 + (Math.abs(difference) / targetAbandonment) * 0.3; // Moderate increase
      return Math.min(5, Math.ceil(currentLinesPerAgent * increaseFactor)); // Cap at 5:1
    }

    return currentLinesPerAgent;
  }

  /**
   * Calculate how many calls to launch right now
   * 
   * Logic:
   * - Want to have enough calls in progress so that when one ends, another is ringing
   * - But don't exceed max concurrent calls
   * - Account for agents currently available
   */
  private calculateRecommendedCalls(
    metrics: CallMetrics,
    linesPerAgent: number,
    maxConcurrentCalls: number,
  ): number {
    // Target calls in progress = linesPerAgent * activeAgents
    const targetCallsInProgress = linesPerAgent * metrics.activeAgents;
    
    // Additional calls needed = target - current
    const callsNeeded = targetCallsInProgress - metrics.callsInProgress;
    
    // Respect max concurrent calls limit
    const remainingCapacity = maxConcurrentCalls - metrics.callsInProgress;
    
    // Can't launch more than available agents can handle
    const limitedByAgents = Math.min(callsNeeded, remainingCapacity, metrics.availableAgents);
    
    // Can't launch negative calls
    return Math.max(0, limitedByAgents);
  }

  /**
   * Determine reason for not dialing
   */
  private getNoDialReason(metrics: CallMetrics, config: PacingConfig): string {
    if (metrics.availableAgents === 0) {
      return 'No agents available';
    }

    if (metrics.callsInProgress >= config.maxConcurrentCalls) {
      return 'Max concurrent calls reached';
    }

    if (metrics.activeAgents === 0) {
      return 'No active agents';
    }

    return 'Pacing algorithm recommends waiting';
  }

  /**
   * Calculate predicted wait time for next agent
   * Based on average handle time of current calls
   */
  calculatePredictedWaitTime(metrics: CallMetrics, avgHandleTime: number): number {
    if (metrics.callsInProgress === 0 || metrics.activeAgents === 0) {
      return 0;
    }

    // Simple prediction: if calls are ending soon, wait time is short
    const callsPerAgent = metrics.callsInProgress / metrics.activeAgents;
    
    // If we have more calls than agents, some agents will finish soon
    // Estimate: some portion of avgHandleTime
    if (callsPerAgent > 1) {
      return avgHandleTime * 0.3; // Assume 30% of AHT
    }

    return avgHandleTime * 0.8; // Most of AHT if 1:1 ratio
  }
}
