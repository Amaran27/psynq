import { IsEnum } from 'class-validator';
import { AgentStatus } from '@psynq/core';

export class UpdateStatusDto {
  @IsEnum(AgentStatus)
  status: AgentStatus;
}
