/**
 * IVR DTOs (Data Transfer Objects)
 * 
 * Request/Response objects with validation decorators
 */

import { IsString, IsEnum, IsArray, IsOptional, IsObject, ValidateNested, IsUUID, IsDate, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IVRFlowStatus } from '../modules/ivr/domain/ivr-flow.domain';
import { IVRExecutionStatus } from '../modules/ivr/domain/ivr-execution-log.domain';

/**
 * IVR Node DTO
 */
export class IVRNodeDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsObject()
  config: Record<string, any>;

  @ApiProperty()
  @IsObject()
  position: { x: number; y: number };
}

/**
 * Create IVR Flow DTO
 */
export class CreateFlowDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [IVRNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IVRNodeDto)
  nodes: IVRNodeDto[];

  @ApiProperty()
  @IsString()
  entryNodeId: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}

/**
 * Update IVR Flow DTO
 */
export class UpdateFlowDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [IVRNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IVRNodeDto)
  @IsOptional()
  nodes?: IVRNodeDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  entryNodeId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}

/**
 * Flow Response DTO
 */
export class FlowResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ enum: IVRFlowStatus })
  status: IVRFlowStatus;

  @ApiProperty({ type: [IVRNodeDto] })
  nodes: IVRNodeDto[];

  @ApiProperty()
  entryNodeId: string;

  @ApiProperty()
  variables: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromDomain(flow: any): FlowResponseDto {
    const dto = new FlowResponseDto();
    dto.id = flow.id;
    dto.name = flow.name;
    dto.description = flow.description;
    dto.organizationId = flow.organizationId;
    dto.status = flow.status;
    dto.nodes = flow.nodes;
    dto.entryNodeId = flow.entryNodeId;
    dto.variables = flow.variables;
    dto.createdAt = flow.createdAt;
    dto.updatedAt = flow.updatedAt;
    return dto;
  }
}

/**
 * Flow List Response DTO
 */
export class FlowListResponseDto {
  @ApiProperty({ type: [FlowResponseDto] })
  flows: FlowResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}

/**
 * List Flows Query DTO
 */
export class ListFlowsQueryDto {
  @ApiPropertyOptional({ enum: IVRFlowStatus })
  @IsEnum(IVRFlowStatus)
  @IsOptional()
  status?: IVRFlowStatus;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * Execution Step DTO
 */
export class ExecutionStepDto {
  @ApiProperty()
  nodeId: string;

  @ApiProperty()
  nodeType: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  timestamp: Date;

  @ApiPropertyOptional()
  input?: string;

  @ApiPropertyOptional()
  output?: string;

  @ApiPropertyOptional()
  duration?: number;
}

/**
 * Execution Log Response DTO
 */
export class ExecutionLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  flowId: string;

  @ApiProperty()
  flowName: string;

  @ApiProperty()
  callId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ enum: IVRExecutionStatus })
  status: IVRExecutionStatus;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty({ type: [ExecutionStepDto] })
  steps: ExecutionStepDto[];

  @ApiProperty()
  variables: Record<string, any>;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  exitReason?: string;

  @ApiPropertyOptional()
  duration?: number;

  static fromDomain(log: any): ExecutionLogResponseDto {
    const dto = new ExecutionLogResponseDto();
    dto.id = log.id;
    dto.flowId = log.flowId;
    dto.flowName = log.flowName;
    dto.callId = log.callId;
    dto.organizationId = log.organizationId;
    dto.status = log.status;
    dto.startedAt = log.startedAt;
    dto.completedAt = log.completedAt;
    dto.steps = log.steps;
    dto.variables = log.variables;
    dto.errorMessage = log.errorMessage;
    dto.exitReason = log.exitReason;
    dto.duration = log.getDuration();
    return dto;
  }
}

/**
 * Flow Analytics Query DTO
 */
export class FlowAnalyticsQueryDto {
  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}

/**
 * Common Path DTO
 */
export class CommonPathDto {
  @ApiProperty({ type: [String] })
  path: string[];

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

/**
 * Flow Analytics Response DTO
 */
export class FlowAnalyticsResponseDto {
  @ApiProperty()
  totalExecutions: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  abandoned: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  failureRate: number;

  @ApiProperty()
  abandonmentRate: number;

  @ApiProperty()
  avgDuration: number;

  @ApiProperty({ type: [CommonPathDto] })
  commonPaths: CommonPathDto[];
}
