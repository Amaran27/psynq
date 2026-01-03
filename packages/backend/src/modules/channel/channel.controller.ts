/**
 * Channel Controller (Refactored to Hexagonal Architecture)
 * 
 * Thin controller that delegates to use cases.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateChannelUseCase, CreateChannelCommand } from './application/create-channel.usecase';
import { GetChannelUseCase } from './application/get-channel.usecase';
import { ListChannelsUseCase, ListChannelsQuery } from './application/list-channels.usecase';
import { AnswerChannelUseCase, AnswerChannelCommand } from './application/answer-channel.usecase';
import { HangupChannelUseCase, HangupChannelCommand } from './application/hangup-channel.usecase';
import { PlayMediaUseCase, PlayMediaCommand } from './application/play-media.usecase';
import {
  CreateChannelDto,
  ChannelResponseDto,
  ChannelActionDto,
  PlayMediaDto,
  SpeakDto,
} from '../../dtos/channel.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelController {
  constructor(
    private readonly createChannelUseCase: CreateChannelUseCase,
    private readonly getChannelUseCase: GetChannelUseCase,
    private readonly listChannelsUseCase: ListChannelsUseCase,
    private readonly answerChannelUseCase: AnswerChannelUseCase,
    private readonly hangupChannelUseCase: HangupChannelUseCase,
    private readonly playMediaUseCase: PlayMediaUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create outbound channel',
    description:
      'Originates a new outbound channel (call leg) to the specified endpoint. Returns immediately with channel details.',
  })
  @ApiBody({ type: CreateChannelDto })
  @ApiResponse({
    status: 201,
    description: 'Channel created successfully',
    type: ChannelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createChannel(
    @Body() dto: CreateChannelDto,
    @Req() req: any,
  ): Promise<ChannelResponseDto> {
    const orgId = req.user?.organizationId || undefined;

    const command: CreateChannelCommand = {
      endpoint: dto.endpoint,
      organizationId: orgId,
      callerId: dto.callerId,
      callId: dto.callId,
      channelvars: dto.channelvars,
    };

    const channel = await this.createChannelUseCase.execute(command);
    return this.toResponseDto(channel);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get channel details',
    description: 'Retrieves detailed information about a specific channel by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Channel ID', example: 'PJSIP/trunk-00000001' })
  @ApiResponse({
    status: 200,
    description: 'Channel details',
    type: ChannelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChannel(@Param('id') id: string): Promise<ChannelResponseDto> {
    const channel = await this.getChannelUseCase.execute(id);
    return this.toResponseDto(channel);
  }

  @Get()
  @ApiOperation({
    summary: 'List active channels',
    description: 'Returns all active (not ended) channels, optionally filtered by organization.',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Filter by organization ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active channels',
    type: [ChannelResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listActiveChannels(
    @Query('organizationId') organizationId?: string,
  ): Promise<ChannelResponseDto[]> {
    const query: ListChannelsQuery = {
      organizationId,
    };

    const channels = await this.listChannelsUseCase.execute(query);
    return channels.map(ch => this.toResponseDto(ch));
  }

  @Put(':id/answer')
  @ApiOperation({
    summary: 'Answer channel',
    description:
      'Answers an incoming channel (ringing state). Idempotent - safe to call multiple times.',
  })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({
    status: 200,
    description: 'Channel answered',
    type: ChannelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Channel cannot be answered in current state' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async answerChannel(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ChannelResponseDto> {
    const orgId = req.user?.organizationId || undefined;

    const command: AnswerChannelCommand = {
      channelId: id,
      organizationId: orgId,
    };

    const channel = await this.answerChannelUseCase.execute(command);
    return this.toResponseDto(channel);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Hang up channel',
    description:
      'Terminates a channel (hangs up). Idempotent - safe to call multiple times.',
  })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiBody({ type: ChannelActionDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Channel hung up',
    type: ChannelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async hangupChannel(
    @Param('id') id: string,
    @Body() dto: ChannelActionDto,
    @Req() req: any,
  ): Promise<ChannelResponseDto> {
    const orgId = req.user?.organizationId || undefined;

    const command: HangupChannelCommand = {
      channelId: id,
      organizationId: orgId,
      reason: dto.reason,
    };

    const channel = await this.hangupChannelUseCase.execute(command);
    return this.toResponseDto(channel);
  }

  @Post(':id/play')
  @ApiOperation({
    summary: 'Play media to channel',
    description:
      'Plays audio media to the channel. Supports sound files, recordings, or HTTP URLs.',
  })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiBody({ type: PlayMediaDto })
  @ApiResponse({ status: 200, description: 'Media playback initiated' })
  @ApiResponse({ status: 400, description: 'Channel not in correct state' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async playMedia(
    @Param('id') id: string,
    @Body() dto: PlayMediaDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const orgId = req.user?.organizationId || undefined;

    const command: PlayMediaCommand = {
      channelId: id,
      organizationId: orgId,
      media: dto.media,
      lang: dto.lang,
    };

    await this.playMediaUseCase.execute(command);
    return { message: 'Media playback initiated' };
  }

  /**
   * Convert domain model to response DTO
   * This isolates the domain from API/DTO concerns
   */
  private toResponseDto(channel: any): ChannelResponseDto {
    return {
      id: channel.id,
      organizationId: channel.organizationId,
      callId: channel.callId,
      bridgeId: channel.bridgeId,
      state: channel.state,
      direction: channel.direction,
      callerName: channel.callerName,
      callerNumber: channel.callerNumber,
      connectedName: channel.connectedName,
      connectedNumber: channel.connectedNumber,
      dialedNumber: channel.dialedNumber,
      language: channel.language,
      accountCode: channel.accountCode,
      channelvars: channel.channelvars,
      createdAt: channel.createdAt,
      answeredAt: channel.answeredAt,
      endedAt: channel.endedAt,
    } as ChannelResponseDto;
  }
}
