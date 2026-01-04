/**
 * Predictive Dialer Controller
 * 
 * Hexagonal Architecture - HTTP layer
 * Manages predictive dialing sessions (algorithmic auto-dialing)
 */

import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { 
  StartPredictiveDialingDto,
  PredictiveDialingSessionResponseDto,
} from '../../dtos/dialer.dto';
import { StartPredictiveDialingUseCase } from './application/start-predictive-dialing.usecase';

/**
 * Predictive Dialer Endpoints
 * 
 * Predictive mode: System automatically dials multiple leads per agent
 * using algorithms to maximize agent talk time while minimizing abandonment
 * 
 * Key differences from Preview:
 * - Agent does NOT review leads before calling
 * - System uses pacing algorithm to dial optimal number of lines
 * - Target abandonment rate (typically 3-5%)
 * - Higher throughput but requires careful tuning
 */
@ApiTags('Dialer - Predictive')
@Controller('dialer/predictive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PredictiveDialerController {
  constructor(
    private readonly startPredictiveDialingUseCase: StartPredictiveDialingUseCase,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start predictive dialing session',
    description: `
      Starts a predictive dialing session with algorithmic pacing.
      
      **Predictive Dialing:**
      - System automatically dials multiple leads per agent
      - Pacing algorithm adjusts lines-per-agent ratio dynamically
      - Target abandonment rate (e.g., 3%) controls aggressiveness
      - When call answers, system bridges to available agent
      - Maximizes agent talk time and throughput
      
      **Configuration:**
      - targetAbandonmentRate: Target % of calls that ring but no agent available (default 3%)
      - linesPerAgent: Initial ratio of lines to dial per agent (default 2.0, algorithm adjusts)
      - maxConcurrentCalls: Hard limit on simultaneous calls (default: agents × 3)
      
      **Example:**
      \`\`\`json
      {
        "campaignId": "123e4567-e89b-12d3-a456-426614174000",
        "agentIds": ["agent1", "agent2", "agent3"],
        "targetAbandonmentRate": 0.03,
        "linesPerAgent": 2.0,
        "maxConcurrentCalls": 50
      }
      \`\`\`
    `,
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Predictive dialing session started successfully', 
    type: PredictiveDialingSessionResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters or campaign already active' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async startSession(@Body() dto: StartPredictiveDialingDto): Promise<PredictiveDialingSessionResponseDto> {
    const session = await this.startPredictiveDialingUseCase.execute({
      campaignId: dto.campaignId,
      agentIds: dto.agentIds,
      targetAbandonmentRate: dto.targetAbandonmentRate,
      linesPerAgent: dto.linesPerAgent,
      maxConcurrentCalls: dto.maxConcurrentCalls,
    });

    return {
      id: session.id,
      campaignId: session.campaignId,
      mode: session.mode,
      status: session.status,
      pacingConfig: {
        linesPerAgent: session.pacingConfig.linesPerAgent,
        targetAbandonmentRate: session.pacingConfig.targetAbandonmentRate,
        maxConcurrentCalls: session.pacingConfig.maxConcurrentCalls,
        dialTimeoutSeconds: session.pacingConfig.dialTimeoutSeconds,
      },
      stats: {
        leadsProcessed: session.stats.leadsProcessed,
        callsAttempted: session.stats.callsAttempted,
        callsAnswered: session.stats.callsAnswered,
        callsAbandoned: session.stats.callsAbandoned,
        avgWaitTimeSeconds: session.stats.avgWaitTimeSeconds,
        avgTalkTimeSeconds: session.stats.avgTalkTimeSeconds,
        conversionRate: session.stats.conversionRate,
      },
      activeAgentIds: session.activeAgentIds,
      startedAt: session.startedAt,
      createdAt: session.createdAt,
      message: `Predictive dialing session started with ${session.activeAgentIds.length} agents. Target abandonment: ${(session.pacingConfig.targetAbandonmentRate * 100).toFixed(1)}%`,
    };
  }
}
