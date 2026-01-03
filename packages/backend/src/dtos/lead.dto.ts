import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsInt,
  IsArray,
  IsObject,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { LeadStatus, LeadPriority } from '../entities/lead.entity';

export class CreateLeadDto {
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Phone number', example: '+918608273468' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ enum: LeadPriority, default: LeadPriority.MEDIUM })
  @IsEnum(LeadPriority)
  @IsOptional()
  priority?: LeadPriority;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Assigned agent ID' })
  @IsString()
  @IsOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Timezone', example: 'Asia/Kolkata' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: LeadPriority })
  @IsEnum(LeadPriority)
  @IsOptional()
  priority?: LeadPriority;

  @ApiPropertyOptional({ description: 'Assigned agent ID' })
  @IsString()
  @IsOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class LeadResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  campaignId?: string;

  @ApiProperty()
  firstName: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  company?: string;

  @ApiProperty({ enum: LeadStatus })
  status: LeadStatus;

  @ApiProperty({ enum: LeadPriority })
  priority: LeadPriority;

  @ApiPropertyOptional()
  assignedAgentId?: string;

  @ApiProperty()
  attemptCount: number;

  @ApiPropertyOptional()
  lastAttemptAt?: Date;

  @ApiPropertyOptional()
  nextAttemptAt?: Date;

  @ApiPropertyOptional()
  callHistory?: Array<any>;

  @ApiPropertyOptional()
  customFields?: Record<string, any>;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  tags?: string[];

  @ApiPropertyOptional()
  timezone?: string;

  @ApiPropertyOptional()
  convertedAt?: Date;

  @ApiPropertyOptional()
  conversionValue?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ImportLeadsDto {
  @ApiProperty({ description: 'Array of leads to import', type: [CreateLeadDto] })
  @IsArray()
  leads: CreateLeadDto[];

  @ApiPropertyOptional({ description: 'Campaign ID to assign leads to' })
  @IsString()
  @IsOptional()
  campaignId?: string;
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus, description: 'New lead status' })
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @ApiPropertyOptional({ description: 'Notes about status change' })
  @IsString()
  @IsOptional()
  notes?: string;
}
