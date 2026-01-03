/**
 * Bridge Controller (Refactored to Hexagonal Architecture)
 * 
 * Thin controller that delegates to use cases.
 * Controllers in hexagonal architecture should:
 * - Handle HTTP concerns only (validation, parsing, response formatting)
 * - Delegate all business logic to use cases
 * - Be framework-dependent (this is OK for controllers)
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CreateBridgeUseCase, CreateBridgeCommand } from './application/create-bridge.usecase';
import { GetBridgeUseCase } from './application/get-bridge.usecase';
import { ListBridgesUseCase, ListBridgesQuery } from './application/list-bridges.usecase';
import { AddChannelToBridgeUseCase, AddChannelToBridgeCommand } from './application/add-channel-to-bridge.usecase';
import { RemoveChannelFromBridgeUseCase, RemoveChannelFromBridgeCommand } from './application/remove-channel-from-bridge.usecase';
import { DestroyBridgeUseCase } from './application/destroy-bridge.usecase';
import { StartRecordingUseCase, StartRecordingCommand } from './application/start-recording.usecase';
import { StopRecordingUseCase } from './application/stop-recording.usecase';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { 
  CreateBridgeDto, 
  BridgeResponseDto, 
  AddChannelToBridgeDto,
  RemoveChannelFromBridgeDto,
  PlayMediaToBridgeDto,
  StartBridgeRecordingDto 
} from '../../dtos/bridge.dto';

@ApiTags('Bridges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bridges')
export class BridgeController {
  constructor(
    private readonly createBridgeUseCase: CreateBridgeUseCase,
    private readonly getBridgeUseCase: GetBridgeUseCase,
    private readonly listBridgesUseCase: ListBridgesUseCase,
    private readonly addChannelToBridgeUseCase: AddChannelToBridgeUseCase,
    private readonly removeChannelFromBridgeUseCase: RemoveChannelFromBridgeUseCase,
    private readonly destroyBridgeUseCase: DestroyBridgeUseCase,
    private readonly startRecordingUseCase: StartRecordingUseCase,
    private readonly stopRecordingUseCase: StopRecordingUseCase,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new bridge',
    description: 'Creates a new conference bridge for mixing channels together'
  })
  @ApiResponse({ status: 201, description: 'Bridge created successfully', type: BridgeResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createBridge(@Body() dto: CreateBridgeDto): Promise<BridgeResponseDto> {
    const command: CreateBridgeCommand = {
      name: dto.name || '',
      bridgeType: dto.bridgeType as any,
      technology: dto.technology as any,
      organizationId: dto.organizationId,
    };

    const result = await this.createBridgeUseCase.execute(command);
    return this.toResponseDto(result.bridge);
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
    const bridge = await this.getBridgeUseCase.execute(id);
    return this.toResponseDto(bridge);
  }

  @Get()
  @ApiOperation({ 
    summary: 'List active bridges',
    description: 'Returns all active (non-destroyed) bridges, optionally filtered by organization'
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization ID' })
  @ApiResponse({ status: 200, description: 'List of active bridges', type: [BridgeResponseDto] })
  async listBridges(@Query('organizationId') organizationId?: string): Promise<BridgeResponseDto[]> {
    const query: ListBridgesQuery = {
      organizationId,
    };

    const bridges = await this.listBridgesUseCase.execute(query);
    return bridges.map(b => this.toResponseDto(b));
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
    const command: AddChannelToBridgeCommand = {
      bridgeId,
      channelId: dto.channelId,
    };

    const bridge = await this.addChannelToBridgeUseCase.execute(command);
    return this.toResponseDto(bridge);
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
    const command: RemoveChannelFromBridgeCommand = {
      bridgeId,
      channelId,
    };

    const bridge = await this.removeChannelFromBridgeUseCase.execute(command);
    return this.toResponseDto(bridge);
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
    const command: StartRecordingCommand = {
      bridgeId,
      recordingName: dto.name,
    };

    const bridge = await this.startRecordingUseCase.execute(command);
    return this.toResponseDto(bridge);
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
    const bridge = await this.stopRecordingUseCase.execute(bridgeId);
    return this.toResponseDto(bridge);
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
    const bridge = await this.destroyBridgeUseCase.execute(id);
    return this.toResponseDto(bridge);
  }

  /**
   * Convert domain model to response DTO
   * This isolates the domain from API/DTO concerns
   */
  private toResponseDto(bridge: any): BridgeResponseDto {
    return {
      id: bridge.id,
      name: bridge.name,
      bridgeType: bridge.bridgeType,
      technology: bridge.technology,
      organizationId: bridge.organizationId,
      channelIds: bridge.channelIds,
      isRecording: bridge.isRecording,
      recordingName: bridge.recordingName,
      createdAt: bridge.createdAt,
      destroyedAt: bridge.destroyedAt,
    } as BridgeResponseDto;
  }
}
