import { Controller, Get, Post, Put, Body, Param, NotFoundException } from '@nestjs/common';
import { CallService } from './services/call.service.js';
import { CreateCallDto, CallResponseDto, CallActionDto } from './dtos/call.dto.js';

@Controller('calls')
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
  getCall(@Param('id') callId: string): CallResponseDto {
    return this.callService.getCall(callId);
  }

  /**
   * Get all active calls
   */
  @Get()
  getActiveCalls(): CallResponseDto[] {
    return this.callService.getActiveCalls();
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
  holdCall(@Param('id') callId: string): CallResponseDto {
    return this.callService.holdCall(callId);
  }

  /**
   * Resume a call from hold
   */
  @Put(':id/resume')
  resumeCall(@Param('id') callId: string): CallResponseDto {
    return this.callService.resumeCall(callId);
  }

  /**
   * End a call
   */
  @Put(':id/end')
  async endCall(@Param('id') callId: string): Promise<CallResponseDto> {
    return await this.callService.endCall(callId);
  }
}