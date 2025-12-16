import { Controller, Get, Post, Put, Body, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { CallService } from './services/call.service';
import { CreateCallDto, CallResponseDto, CallActionDto } from './dtos/call.dto';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SupervisorControlOptions, CallParticipant } from './interfaces/call-participant.interface';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  /**
   * Create a new outbound call
   */
  @Post()
  async createCall(@Body() createCallDto: CreateCallDto): Promise<CallResponseDto> {
    return await this.callService.createCall(createCallDto);
  }

  /**
   * Get a specific call by ID
   */
  @Get(':id')
  async getCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.getCall(callId);
  }

  /**
   * Get all active calls
   */
  @Get()
  async getActiveCalls(): Promise<CallResponseDto[]> {
    return await this.callService.getActiveCalls();
  }

  /**
   * Answer a ringing call
   */
  @Put(':id/answer')
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
  async holdCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.holdCall(callId);
  }

  /**
   * Resume a call from hold
   */
  @Put(':id/resume')
  async resumeCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.resumeCall(callId);
  }

  /**
   * End a call
   */
  @Put(':id/end')
  async endCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.endCall(callId);
  }

  /**
   * Inject a supervisor (muted by default)
   */
  @Post(':id/supervisor/inject')
  async injectSupervisor(
    @Param('id') callId: string, 
    @Body() body: { supervisorId: string; options?: SupervisorControlOptions }
  ): Promise<CallParticipant> {
    return await this.callService.injectSupervisor(callId, body.supervisorId, body.options);
  }

  /**
   * Unmute (barge-in) the supervisor so they can speak
   */
  @Post(':id/supervisor/unmute')
  async supervisorUnmute(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.supervisorUnmute(callId);
  }

  /**
   * Mute the supervisor (whisper)
   */
  @Post(':id/supervisor/mute')
  async supervisorMute(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.supervisorMute(callId);
  }
}