import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CallService } from './call.service';
import { CreateCallDto, CallResponseDto, CallActionDto } from '../../dtos/call.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  SupervisorControlOptions,
  CallParticipant,
} from '../../interfaces/call-participant.interface';

@ApiTags('Calls')
@ApiBearerAuth()
@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  /**
   * Create a new outbound call
   */
  @Post()
  @ApiOperation({
    summary: 'Create outbound call',
    description: 'Initiates a new outbound call and returns call details',
  })
  @ApiResponse({
    status: 201,
    description: 'Call created successfully',
    type: CallResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request or agent unavailable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCall(
    @Body() createCallDto: CreateCallDto,
    @Req() req,
  ): Promise<CallResponseDto> {
    const agentId = req.user?.userId || req.user?.id || createCallDto.agentId;
    return await this.callService.createCall(createCallDto, agentId);
  }

  /**
   * Get a specific call by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get call details',
    description: 'Retrieves details of a specific call by ID',
  })
  @ApiParam({ name: 'id', description: 'Call ID', example: 'call_123' })
  @ApiResponse({
    status: 200,
    description: 'Call details retrieved',
    type: CallResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Call not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.getCall(callId);
  }

  /**
   * Get all active calls
   */
  @Get()
  @ApiOperation({
    summary: 'List active calls',
    description: 'Returns all calls that are not in ended state',
  })
  @ApiResponse({
    status: 200,
    description: 'Active calls retrieved',
    type: [CallResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActiveCalls(): Promise<CallResponseDto[]> {
    return await this.callService.getActiveCalls();
  }

  /**
   * Answer a ringing call
   */
  @Put(':id/answer')
  @ApiOperation({
    summary: 'Answer call',
    description: 'Answers a ringing call and bridges it to the agent',
  })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Call answered successfully',
    type: CallResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async answerCall(
    @Param('id') callId: string,
    @Body() actionDto: CallActionDto,
  ): Promise<CallResponseDto> {
    return await this.callService.answerCall(callId, actionDto.agentId);
  }

  /**
   * Put a call on hold
   */
  @Put(':id/hold')
  @ApiOperation({
    summary: 'Hold call',
    description: 'Puts an active call on hold',
  })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Call put on hold',
    type: CallResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async holdCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.holdCall(callId);
  }

  /**
   * Resume a call from hold
   */
  @Put(':id/resume')
  @ApiOperation({
    summary: 'Resume call',
    description: 'Resumes a call from hold state',
  })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Call resumed',
    type: CallResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resumeCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.resumeCall(callId);
  }

  /**
   * End a call
   */
  @Put(':id/end')
  @ApiOperation({
    summary: 'End call',
    description: 'Terminates an active call (idempotent)',
  })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Call ended successfully',
    type: CallResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Call not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async endCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.endCall(callId);
  }

  /**
   * Inject a supervisor (muted by default)
   */
  @Post(':id/supervisor/inject')
  @ApiOperation({
    summary: 'Inject supervisor',
    description: 'Adds a supervisor to an active call for monitoring/coaching',
  })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['supervisorId'],
      properties: {
        supervisorId: { type: 'string', example: 'supervisor-123' },
        options: {
          type: 'object',
          properties: {
            muted: { type: 'boolean', default: true },
            mode: { type: 'string', enum: ['whisper', 'barge'], default: 'whisper' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Supervisor injected successfully',
  })
  @ApiResponse({ status: 400, description: 'Capability not supported or invalid state' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async injectSupervisor(
    @Param('id') callId: string,
    @Body() body: { supervisorId: string; options?: SupervisorControlOptions },
  ): Promise<CallParticipant> {
    return await this.callService.injectSupervisor(
      callId,
      body.supervisorId,
      body.options,
    );
  }

  /**
   * Unmute (barge-in) the supervisor so they can speak
   */
  @Post(':id/supervisor/unmute')
  @ApiOperation({
    summary: 'Unmute supervisor (barge)',
    description: 'Unmutes the supervisor so all parties can hear them',
  })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Supervisor unmuted',
    type: CallResponseDto,
  })
  @ApiResponse({ status: 400, description: 'No supervisor or capability not supported' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async supervisorUnmute(
    @Param('id') callId: string,
  ): Promise<CallResponseDto> {
    return await this.callService.supervisorUnmute(callId);
  }

  /**
   * Mute the supervisor (whisper)
   */
  @Post(':id/supervisor/mute')
  @ApiOperation({
    summary: 'Mute supervisor (whisper)',
    description: 'Mutes the supervisor so only the agent can hear them',
  })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Supervisor muted',
    type: CallResponseDto,
  })
  @ApiResponse({ status: 400, description: 'No supervisor or capability not supported' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async supervisorMute(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.supervisorMute(callId);
  }
}
