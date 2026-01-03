import { IsString, IsOptional, IsUUID } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCallDto {
  @ApiProperty({
    description: 'Caller phone number or identifier',
    example: '+15551234567',
  })
  @IsString()
  from: string;

  @ApiProperty({
    description: 'Destination phone number',
    example: '+15559876543',
  })
  @IsString()
  to: string;

  @ApiPropertyOptional({
    description: 'Agent ID to handle the call',
    example: 'agent-123',
  })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: 'org-456',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class CallResponseDto {
  @ApiProperty({ description: 'Unique call identifier', example: 'call_123' })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Current call state',
    example: 'answered',
    enum: ['idle', 'ringing', 'answered', 'on_hold', 'ended'],
  })
  @Expose()
  state: string;

  @ApiProperty({
    description: 'Call direction',
    example: 'outbound',
    enum: ['inbound', 'outbound'],
  })
  @Expose()
  direction: string;

  @ApiProperty({ description: 'Caller identifier', example: '+15551234567' })
  @Expose()
  from: string;

  @ApiProperty({ description: 'Destination', example: '+15559876543' })
  @Expose()
  to: string;

  @ApiPropertyOptional({ description: 'Agent handling the call', example: 'agent-123' })
  @Expose()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Organization ID', example: 'org-456' })
  @Expose()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Call start time', type: Date })
  @Expose()
  @Type(() => Date)
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Time call was answered', type: Date })
  @Expose()
  @Type(() => Date)
  answeredAt?: Date;

  @ApiPropertyOptional({ description: 'Time call ended', type: Date })
  @Expose()
  @Type(() => Date)
  endedAt?: Date;
}

export class CallActionDto {
  @ApiPropertyOptional({
    description: 'Agent ID for the action',
    example: 'agent-123',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
