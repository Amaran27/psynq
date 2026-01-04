/**
 * Create Flow DTO
 */

import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NodeType } from '../../domain/ivr-node.domain';

export class NodePositionDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  x: number;

  @ApiProperty({ example: 200 })
  @IsNumber()
  y: number;
}

export class NodeConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  prompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  promptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional()
  @IsOptional()
  options?: any[];
}

export class CreateNodeDto {
  @ApiProperty({ example: 'node-1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ enum: NodeType, example: NodeType.MENU })
  @IsEnum(NodeType)
  type: NodeType;

  @ApiProperty({ example: 'Main Menu' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ type: NodeConfigDto })
  @ValidateNested()
  @Type(() => NodeConfigDto)
  config: NodeConfigDto;

  @ApiProperty({ type: NodePositionDto })
  @ValidateNested()
  @Type(() => NodePositionDto)
  position: NodePositionDto;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class FlowConnectionDto {
  @ApiProperty({ example: 'conn-1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'node-1' })
  @IsString()
  @IsNotEmpty()
  sourceNodeId: string;

  @ApiProperty({ example: 'node-2' })
  @IsString()
  @IsNotEmpty()
  targetNodeId: string;

  @ApiPropertyOptional({ example: 'Option 1' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  condition?: string;
}

export class FlowVariableDto {
  @ApiProperty({ example: 'accountNumber' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean'], example: 'string' })
  @IsEnum(['string', 'number', 'boolean'])
  type: 'string' | 'number' | 'boolean';

  @ApiPropertyOptional()
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateFlowDto {
  @ApiProperty({ example: 'Customer Support IVR' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Main customer service flow' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [CreateNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNodeDto)
  nodes: CreateNodeDto[];

  @ApiProperty({ type: [FlowConnectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowConnectionDto)
  connections: FlowConnectionDto[];

  @ApiPropertyOptional({ type: [FlowVariableDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowVariableDto)
  @IsOptional()
  variables?: FlowVariableDto[];

  @ApiProperty({ example: 'node-start' })
  @IsString()
  @IsNotEmpty()
  startNodeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
