import { IsEnum } from 'class-validator';
import { AgentStatus } from '../enums/agent-status.enum';

export class UpdateStatusDto {
  @IsEnum(AgentStatus)
  status: AgentStatus;
}
