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
import { ChannelService } from './channel.service';
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
  constructor(private readonly channelService: ChannelService) {}

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
    const orgId = req.user?.organizationId || null;

    const channel = await this.channelService.createChannel(
      dto.endpoint,
      orgId,
      dto.callerId,
      dto.callId,
      dto.channelvars,
    );

    return plainToInstance(ChannelResponseDto, channel, {
      excludeExtraneousValues: true,
    });
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
    const channel = await this.channelService.getChannel(id);
    return plainToInstance(ChannelResponseDto, channel, {
      excludeExtraneousValues: true,
    });
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
    const channels = await this.channelService.listActiveChannels(organizationId);
    return channels.map((ch) =>
      plainToInstance(ChannelResponseDto, ch, { excludeExtraneousValues: true }),
    );
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
    const orgId = req.user?.organizationId || null;
    const channel = await this.channelService.answerChannel(id, orgId);
    return plainToInstance(ChannelResponseDto, channel, {
      excludeExtraneousValues: true,
    });
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
    const orgId = req.user?.organizationId || null;
    const channel = await this.channelService.hangupChannel(id, orgId, dto.reason);
    return plainToInstance(ChannelResponseDto, channel, {
      excludeExtraneousValues: true,
    });
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
    const orgId = req.user?.organizationId || null;
    await this.channelService.playMedia(id, orgId, dto.media, dto.lang);
    return { message: 'Media playback initiated' };
  }

  @Post(':id/speak')
  @ApiOperation({
    summary: 'Speak text to channel (TTS)',
    description:
      'Uses text-to-speech to speak the provided text to the channel.',
  })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiBody({ type: SpeakDto })
  @ApiResponse({ status: 200, description: 'TTS initiated' })
  @ApiResponse({ status: 400, description: 'Channel not in correct state' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async speak(
    @Param('id') id: string,
    @Body() dto: SpeakDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const orgId = req.user?.organizationId || null;
    await this.channelService.speak(id, orgId, dto.text, dto.voice);
    return { message: 'TTS initiated' };
  }
}
