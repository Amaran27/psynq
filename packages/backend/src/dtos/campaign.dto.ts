import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, IsNumber, IsObject, IsDateString, Min, Max } from 'class-validator';
import { CampaignType, CampaignStatus, DialMode } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name', example: 'Q1 Sales Outreach' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: CampaignType, default: CampaignType.PREVIEW })
  @IsEnum(CampaignType)
  @IsOptional()
  type?: CampaignType;

  @ApiPropertyOptional({ enum: DialMode, default: DialMode.PREVIEW })
  @IsEnum(DialMode)
  @IsOptional()
  dialMode?: DialMode;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Campaign start time' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Campaign end time' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Schedule configuration' })
  @IsObject()
  @IsOptional()
  schedule?: {
    timezone?: string;
    workDays?: number[];
    startHour?: number;
    endHour?: number;
  };

  @ApiPropertyOptional({ description: 'Maximum dial attempts per lead', default: 3 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Retry interval in minutes', default: 60 })
  @IsInt()
  @Min(1)
  @IsOptional()
  retryIntervalMinutes?: number;

  @ApiPropertyOptional({ description: 'Target abandonment rate (predictive)', default: 0.03 })
  @IsNumber()
  @Min(0)
  @Max(0.1)
  @IsOptional()
  abandonmentRate?: number;

  @ApiPropertyOptional({ description: 'Lines per agent (power/predictive)', default: 1 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  linesPerAgent?: number;

  @ApiPropertyOptional({ description: 'Lead list ID' })
  @IsString()
  @IsOptional()
  leadListId?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: CampaignType })
  @IsEnum(CampaignType)
  @IsOptional()
  type?: CampaignType;

  @ApiPropertyOptional({ enum: DialMode })
  @IsEnum(DialMode)
  @IsOptional()
  dialMode?: DialMode;

  @ApiPropertyOptional({ description: 'Campaign start time' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Campaign end time' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Schedule configuration' })
  @IsObject()
  @IsOptional()
  schedule?: {
    timezone?: string;
    workDays?: number[];
    startHour?: number;
    endHour?: number;
  };

  @ApiPropertyOptional({ description: 'Maximum dial attempts per lead' })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Retry interval in minutes' })
  @IsInt()
  @Min(1)
  @IsOptional()
  retryIntervalMinutes?: number;

  @ApiPropertyOptional({ description: 'Target abandonment rate' })
  @IsNumber()
  @Min(0)
  @Max(0.1)
  @IsOptional()
  abandonmentRate?: number;

  @ApiPropertyOptional({ description: 'Lines per agent' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  linesPerAgent?: number;

  @ApiPropertyOptional({ description: 'Lead list ID' })
  @IsString()
  @IsOptional()
  leadListId?: string;
}

export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  organizationId?: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: CampaignType })
  type: CampaignType;

  @ApiProperty({ enum: CampaignStatus })
  status: CampaignStatus;

  @ApiProperty({ enum: DialMode })
  dialMode: DialMode;

  @ApiPropertyOptional()
  startTime?: Date;

  @ApiPropertyOptional()
  endTime?: Date;

  @ApiPropertyOptional()
  schedule?: object;

  @ApiProperty()
  maxAttempts: number;

  @ApiProperty()
  retryIntervalMinutes: number;

  @ApiPropertyOptional()
  abandonmentRate?: number;

  @ApiPropertyOptional()
  linesPerAgent?: number;

  @ApiPropertyOptional()
  leadListId?: string;

  @ApiProperty()
  totalLeads: number;

  @ApiProperty()
  contactedLeads: number;

  @ApiProperty()
  successfulCalls: number;

  @ApiProperty()
  failedAttempts: number;

  @ApiProperty()
  avgCallDurationSeconds: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}

export class CampaignStatsDto {
  @ApiProperty()
  campaignId: string;

  @ApiProperty()
  totalLeads: number;

  @ApiProperty()
  contactedLeads: number;

  @ApiProperty()
  pendingLeads: number;

  @ApiProperty()
  successfulCalls: number;

  @ApiProperty()
  failedAttempts: number;

  @ApiProperty()
  avgCallDurationSeconds: number;

  @ApiProperty({ description: 'Contact rate (contacted/total)' })
  contactRate: number;

  @ApiProperty({ description: 'Success rate (successful/contacted)' })
  successRate: number;
}
