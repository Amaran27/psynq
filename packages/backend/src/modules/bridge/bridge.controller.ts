import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BridgeService } from './bridge.service';
import { 
  CreateBridgeDto, 
  BridgeResponseDto, 
  AddChannelToBridgeDto,
  RemoveChannelFromBridgeDto,
  PlayMediaToBridgeDto,
  StartBridgeRecordingDto 
} from '../../dtos/bridge.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('Bridges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bridges')
export class BridgeController {
  constructor(private readonly bridgeService: BridgeService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new bridge',
    description: 'Creates a new conference bridge for mixing channels together'
  })
  @ApiResponse({ status: 201, description: 'Bridge created successfully', type: BridgeResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createBridge(@Body() dto: CreateBridgeDto): Promise<BridgeResponseDto> {
    return this.bridgeService.createBridge(dto);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get bridge details',
    description: 'Retrieves bridge information including participant channels'
  })
  @ApiParam({ name: 'id', description: 'Bridge ID', example: 'bridge-12345678' })
  @ApiResponse({ status: 200, description: 'Bridge found', type: BridgeResponseDto })
  @ApiResponse({ status: 404, description: 'Bridge not found' })
  async getBridge(@Param('id') id: string): Promise<BridgeResponseDto> {
    return this.bridgeService.getBridge(id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'List active bridges',
    description: 'Returns all active (non-destroyed) bridges, optionally filtered by organization'
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization ID' })
  @ApiResponse({ status: 200, description: 'List of active bridges', type: [BridgeResponseDto] })
  async listBridges(@Query('organizationId') organizationId?: string): Promise<BridgeResponseDto[]> {
    return this.bridgeService.listActiveBridges(organizationId);
  }

  @Post(':id/channels')
  @ApiOperation({ 
    summary: 'Add channel to bridge',
    description: 'Adds a channel to the conference bridge'
  })
  @ApiParam({ name: 'id', description: 'Bridge ID', example: 'bridge-12345678' })
  @ApiResponse({ status: 200, description: 'Channel added to bridge', type: BridgeResponseDto })
  @ApiResponse({ status: 404, description: 'Bridge not found' })
  async addChannel(
    @Param('id') bridgeId: string,
    @Body() dto: AddChannelToBridgeDto,
  ): Promise<BridgeResponseDto> {
    return this.bridgeService.addChannelToBridge(bridgeId, dto);
  }

  @Delete(':id/channels/:channelId')
  @ApiOperation({ 
    summary: 'Remove channel from bridge',
    description: 'Removes a channel from the conference bridge'
  })
  @ApiParam({ name: 'id', description: 'Bridge ID', example: 'bridge-12345678' })
  @ApiParam({ name: 'channelId', description: 'Channel ID to remove', example: 'channel-123456' })
  @ApiResponse({ status: 200, description: 'Channel removed from bridge', type: BridgeResponseDto })
  @ApiResponse({ status: 404, description: 'Bridge not found' })
  async removeChannel(
    @Param('id') bridgeId: string,
    @Param('channelId') channelId: string,
  ): Promise<BridgeResponseDto> {
    return this.bridgeService.removeChannelFromBridge(bridgeId, channelId);
  }

  @Post(':id/play')
  @ApiOperation({ 
    summary: 'Play media to bridge',
    description: 'Plays audio to all participants in the bridge'
  })
  @ApiParam({ name: 'id', description: 'Bridge ID', example: 'bridge-12345678' })
  @ApiResponse({ status: 200, description: 'Media playing to bridge' })
  @ApiResponse({ status: 400, description: 'Invalid bridge state' })
  @ApiResponse({ status: 404, description: 'Bridge not found' })
  async playMedia(
    @Param('id') bridgeId: string,
    @Body() dto: PlayMediaToBridgeDto,
  ): Promise<{ message: string }> {
    await this.bridgeService.playMediaToBridge(bridgeId, dto);
    return { message: `Playing media to bridge ${bridgeId}` };
  }

  @Post(':id/record')
  @ApiOperation({ 
    summary: 'Start bridge recording',
    description: 'Starts recording all audio in the bridge'
  })
  @ApiParam({ name: 'id', description: 'Bridge ID', example: 'bridge-12345678' })
  @ApiResponse({ status: 200, description: 'Recording started', type: BridgeResponseDto })
  @ApiResponse({ status: 400, description: 'Already recording' })
  @ApiResponse({ status: 404, description: 'Bridge not found' })
  async startRecording(
    @Param('id') bridgeId: string,
    @Body() dto: StartBridgeRecordingDto,
  ): Promise<BridgeResponseDto> {
    return this.bridgeService.startRecording(bridgeId, dto);
  }

  @Delete(':id/record')
  @ApiOperation({ 
    summary: 'Stop bridge recording',
    description: 'Stops the active recording on the bridge'
  })
  @ApiParam({ name: 'id', description: 'Bridge ID', example: 'bridge-12345678' })
  @ApiResponse({ status: 200, description: 'Recording stopped', type: BridgeResponseDto })
  @ApiResponse({ status: 404, description: 'Bridge not found' })
  async stopRecording(@Param('id') bridgeId: string): Promise<BridgeResponseDto> {
    return this.bridgeService.stopRecording(bridgeId);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Destroy bridge',
    description: 'Destroys the bridge and removes all channels'
  })
  @ApiParam({ name: 'id', description: 'Bridge ID', example: 'bridge-12345678' })
  @ApiResponse({ status: 200, description: 'Bridge destroyed', type: BridgeResponseDto })
  @ApiResponse({ status: 404, description: 'Bridge not found' })
  async destroyBridge(@Param('id') id: string): Promise<BridgeResponseDto> {
    return this.bridgeService.destroyBridge(id);
  }
}
