import { IsString, IsOptional, IsUUID } from 'class-validator';
import { Expose, Type } from 'class-transformer';

export class CreateCallDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class CallResponseDto {
  @Expose()
  id: string;

  @Expose()
  state: string;

  @Expose()
  direction: string;

  @Expose()
  from: string;

  @Expose()
  to: string;

  @Expose()
  agentId?: string;

  @Expose()
  organizationId?: string;

  @Expose()
  @Type(() => Date)
  startedAt?: Date;

  @Expose()
  @Type(() => Date)
  answeredAt?: Date;

  @Expose()
  @Type(() => Date)
  endedAt?: Date;
}

export class CallActionDto {
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
