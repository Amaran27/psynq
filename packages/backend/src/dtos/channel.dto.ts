import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelState, ChannelDirection } from '../entities/channel.entity';

export class CreateChannelDto {
  @ApiProperty({
    description: 'Destination endpoint to dial',
    example: 'PJSIP/+15551234567@trunk',
  })
  @IsString()
  endpoint: string;

  @ApiPropertyOptional({
    description: 'Caller ID to present',
    example: '+18005551212',
  })
  @IsOptional()
  @IsString()
  callerId?: string;

  @ApiPropertyOptional({
    description: 'Call ID to associate channel with',
    example: 'call-123',
  })
  @IsOptional()
  @IsString()
  callId?: string;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: 'org-456',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Custom channel variables',
    example: { CAMPAIGN_ID: 'camp-789', AGENT_ID: 'agent-123' },
  })
  @IsOptional()
  @IsObject()
  channelvars?: Record<string, string>;
}

export class ChannelResponseDto {
  @ApiProperty({ description: 'Unique channel identifier', example: 'PJSIP/trunk-00000001' })
  @Expose()
  id: string;

  @ApiPropertyOptional({ description: 'Organization ID', example: 'org-456' })
  @Expose()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Associated call ID', example: 'call-123' })
  @Expose()
  callId?: string;

  @ApiPropertyOptional({ description: 'Bridge ID if bridged', example: 'bridge-abc' })
  @Expose()
  bridgeId?: string;

  @ApiProperty({
    description: 'Current channel state',
    example: 'Up',
    enum: ChannelState,
  })
  @Expose()
  state: ChannelState;

  @ApiProperty({
    description: 'Channel direction',
    example: 'inbound',
    enum: ChannelDirection,
  })
  @Expose()
  direction: ChannelDirection;

  @ApiProperty({ description: 'Caller ID name', example: 'John Doe' })
  @Expose()
  callerName: string;

  @ApiProperty({ description: 'Caller ID number', example: '+15551234567' })
  @Expose()
  callerNumber: string;

  @ApiPropertyOptional({ description: 'Connected party name' })
  @Expose()
  connectedName?: string;

  @ApiPropertyOptional({ description: 'Connected party number' })
  @Expose()
  connectedNumber?: string;

  @ApiPropertyOptional({ description: 'Dialed number' })
  @Expose()
  dialedNumber?: string;

  @ApiPropertyOptional({ description: 'Channel language', example: 'en' })
  @Expose()
  language?: string;

  @ApiPropertyOptional({ description: 'Account code for billing' })
  @Expose()
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Channel variables' })
  @Expose()
  channelvars?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Provider metadata' })
  @Expose()
  providerMetadata?: Record<string, any>;

  @ApiProperty({ description: 'Channel creation time', type: Date })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Time channel was answered', type: Date })
  @Expose()
  @Type(() => Date)
  answeredAt?: Date;

  @ApiPropertyOptional({ description: 'Time channel ended', type: Date })
  @Expose()
  @Type(() => Date)
  endedAt?: Date;

  @ApiProperty({ description: 'Last update time', type: Date })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class ChannelActionDto {
  @ApiPropertyOptional({
    description: 'Reason for action (e.g., hangup cause)',
    example: 'normal-clearing',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PlayMediaDto {
  @ApiProperty({
    description: 'Media URI to play (sound:, recording:, or https://)',
    example: 'sound:demo-congrats',
  })
  @IsString()
  media: string;

  @ApiPropertyOptional({
    description: 'Language for sound files',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  lang?: string;
}

export class SpeakDto {
  @ApiProperty({
    description: 'Text to speak using TTS',
    example: 'Hello, how can I help you today?',
  })
  @IsString()
  text: string;

  @ApiPropertyOptional({
    description: 'Voice/language for TTS',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  voice?: string;
}
