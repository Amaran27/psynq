import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { BridgeType, BridgeTechnology } from '../entities/bridge.entity';

export class CreateBridgeDto {
  @ApiPropertyOptional({ description: 'Bridge name', example: 'Conference Room 1' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Bridge type', 
    enum: BridgeType,
    default: BridgeType.MIXING,
    example: BridgeType.MIXING 
  })
  @IsOptional()
  @IsEnum(BridgeType)
  bridgeType?: BridgeType;

  @ApiPropertyOptional({ 
    description: 'Bridge technology', 
    enum: BridgeTechnology,
    default: BridgeTechnology.SOFTMIX,
    example: BridgeTechnology.SOFTMIX 
  })
  @IsOptional()
  @IsEnum(BridgeTechnology)
  technology?: BridgeTechnology;

  @ApiPropertyOptional({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class AddChannelToBridgeDto {
  @ApiProperty({ description: 'Channel ID to add', example: 'channel-123456' })
  @IsString()
  channelId: string;

  @ApiPropertyOptional({ description: 'Role: participant, announcer, etc.', example: 'participant' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class RemoveChannelFromBridgeDto {
  @ApiProperty({ description: 'Channel ID to remove', example: 'channel-123456' })
  @IsString()
  channelId: string;
}

export class PlayMediaToBridgeDto {
  @ApiProperty({ 
    description: 'Media URI (sound:, recording:, number:, digits:, tone:)', 
    example: 'sound:confbridge-join' 
  })
  @IsString()
  mediaUrl: string;
}

export class StartBridgeRecordingDto {
  @ApiProperty({ description: 'Recording name', example: 'conf-2026-01-03-10-30' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Format: wav, mp3, etc.', default: 'wav', example: 'wav' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'Max duration in seconds', example: 3600 })
  @IsOptional()
  maxDurationSeconds?: number;
}

export class BridgeResponseDto {
  @ApiProperty({ description: 'Bridge ID', example: 'bridge-12345678' })
  id: string;

  @ApiPropertyOptional({ description: 'Bridge name', example: 'Conference Room 1' })
  name?: string;

  @ApiProperty({ description: 'Bridge type', enum: BridgeType, example: BridgeType.MIXING })
  bridgeType: BridgeType;

  @ApiProperty({ description: 'Technology', enum: BridgeTechnology, example: BridgeTechnology.SOFTMIX })
  technology: BridgeTechnology;

  @ApiProperty({ description: 'Channel IDs in bridge', type: [String], example: ['channel-1', 'channel-2'] })
  channelIds: string[];

  @ApiPropertyOptional({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  organizationId?: string;

  @ApiProperty({ description: 'Is recording active', example: false })
  isRecording: boolean;

  @ApiPropertyOptional({ description: 'Recording name', example: 'conf-2026-01-03' })
  recordingName?: string;

  @ApiProperty({ description: 'Created at', example: '2026-01-03T10:00:00Z' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Destroyed at', example: '2026-01-03T11:00:00Z' })
  destroyedAt?: Date;
}
