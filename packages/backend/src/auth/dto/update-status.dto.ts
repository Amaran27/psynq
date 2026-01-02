import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentStatus } from '@psynq/core';

/**
 * Data Transfer Object for updating agent status
 * Used in: POST /auth/status
 */
export class UpdateStatusDto {
  @ApiProperty({
    enum: AgentStatus,
    example: AgentStatus.AVAILABLE,
    description: 'New agent status',
  })
  @IsEnum(AgentStatus)
  status: AgentStatus;

  @ApiPropertyOptional({
    example: 'Starting shift',
    description: 'Reason for status change (optional)',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
