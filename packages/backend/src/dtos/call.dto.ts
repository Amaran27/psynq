import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCallDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  agentId?: string;
}

export class CallResponseDto {
  id: string;
  state: string;
  direction: string;
  from: string;
  to: string;
  agentId?: string;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  supervisorParticipantSid?: string;
}

export class CallActionDto {
  @IsOptional()
  @IsUUID()
  agentId?: string;
}