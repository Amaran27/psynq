import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, IsArray, IsEmail, IsObject, Min, Max, IsNumber } from 'class-validator';
import { LeadStatus, LeadCallOutcome } from '../entities/dialer/lead.entity';
import { DialingMode, SessionStatus } from '../entities/dialer/dialing-session.entity';
import { DNCSource } from '../entities/dialer/dnc-entry.entity';

// Dialing Session DTOs
export class StartDialingSessionDto {
  @ApiProperty({ description: 'Campaign ID', example: 'uuid' })
  @IsString()
  campaignId: string;

  @ApiProperty({ description: 'Agent IDs participating in the session', type: [String] })
  @IsArray()
  @IsString({ each: true })
  agentIds: string[];

  @ApiPropertyOptional({ description: 'Lines per agent', default: 1 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  linesPerAgent?: number;

  @ApiPropertyOptional({ description: 'Max concurrent calls', default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxConcurrentCalls?: number;

  @ApiPropertyOptional({ description: 'Dial timeout in seconds', default: 30 })
  @IsInt()
  @Min(10)
  @Max(120)
  @IsOptional()
  dialTimeoutSeconds?: number;
}

export class SessionStatsDto {
  @ApiProperty()
  leadsProcessed: number;

  @ApiProperty()
  callsAttempted: number;

  @ApiProperty()
  callsAnswered: number;

  @ApiProperty()
  callsAbandoned: number;

  @ApiProperty()
  avgWaitTimeSeconds: number;

  @ApiProperty()
  avgTalkTimeSeconds: number;

  @ApiProperty()
  conversionRate: number;
}

export class DialingSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  campaignId: string;

  @ApiProperty({ enum: DialingMode })
  mode: DialingMode;

  @ApiProperty({ enum: SessionStatus })
  status: SessionStatus;

  @ApiPropertyOptional()
  organizationId?: string;

  @ApiProperty({ type: SessionStatsDto })
  stats: SessionStatsDto;

  @ApiProperty({ type: [String] })
  activeAgentIds: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}

// Lead DTOs for Dialer Module (specific to dialing operations)
export class DialerImportLeadDto {
  @ApiProperty({ description: 'Phone number (E.164 format)', example: '+12345678900' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Priority (1-10)', default: 5 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Custom data' })
  @IsObject()
  @IsOptional()
  customData?: Record<string, any>;
}

export class DialerImportLeadsDto {
  @ApiProperty({ description: 'Campaign ID' })
  @IsString()
  campaignId: string;

  @ApiProperty({ description: 'Array of leads to import', type: [DialerImportLeadDto] })
  @IsArray()
  leads: DialerImportLeadDto[];

  @ApiPropertyOptional({ description: 'Skip duplicate phone numbers', default: true })
  @IsOptional()
  skipDuplicates?: boolean;
}

export class DialerImportLeadsResponseDto {
  @ApiProperty()
  imported: number;

  @ApiProperty()
  skipped: number;

  @ApiProperty({ type: [String] })
  errors: string[];
}

export class RecordDialAttemptDto {
  @ApiProperty({ description: 'Lead ID' })
  @IsString()
  leadId: string;

  @ApiProperty({ enum: LeadCallOutcome, description: 'Call outcome' })
  @IsEnum(LeadCallOutcome)
  outcome: LeadCallOutcome;

  @ApiPropertyOptional({ description: 'Call duration in seconds' })
  @IsInt()
  @Min(0)
  @IsOptional()
  callDurationSeconds?: number;

  @ApiPropertyOptional({ description: 'Notes about the call' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignLeadDto {
  @ApiProperty({ description: 'Campaign ID' })
  @IsString()
  campaignId: string;

  @ApiProperty({ description: 'Agent ID' })
  @IsString()
  agentId: string;
}

export class DialAttemptDto {
  @ApiProperty()
  attemptNumber: number;

  @ApiProperty()
  timestamp: Date;

  @ApiPropertyOptional()
  agentId?: string;

  @ApiPropertyOptional({ enum: LeadCallOutcome })
  outcome?: LeadCallOutcome;

  @ApiPropertyOptional()
  callDurationSeconds?: number;

  @ApiPropertyOptional()
  notes?: string;
}

export class DialerLeadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  campaignId: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty({ enum: LeadStatus })
  status: LeadStatus;

  @ApiProperty()
  priority: number;

  @ApiPropertyOptional()
  timezone?: string;

  @ApiProperty()
  customData: Record<string, any>;

  @ApiProperty({ type: [DialAttemptDto] })
  attempts: DialAttemptDto[];

  @ApiPropertyOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional()
  lastAttemptAt?: Date;

  @ApiPropertyOptional()
  nextAttemptAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  contactedAt?: Date;

  @ApiPropertyOptional()
  convertedAt?: Date;
}

// DNC DTOs
export class AddToDNCDto {
  @ApiProperty({ description: 'Phone number (E.164 format)', example: '+12345678900' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ enum: DNCSource, description: 'Source of DNC request' })
  @IsEnum(DNCSource)
  source: DNCSource;

  @ApiPropertyOptional({ description: 'Reason for adding to DNC' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'User ID who added the entry' })
  @IsString()
  @IsOptional()
  addedBy?: string;

  @ApiPropertyOptional({ description: 'Expiration date (optional)' })
  @IsOptional()
  expiresAt?: Date;
}

export class CheckDNCDto {
  @ApiProperty({ description: 'Phone number to check', example: '+12345678900' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsString()
  @IsOptional()
  organizationId?: string;
}

export class CheckDNCResponseDto {
  @ApiProperty()
  isOnDNCList: boolean;

  @ApiPropertyOptional()
  entry?: {
    id: string;
    phoneNumber: string;
    source: DNCSource;
    reason?: string;
    addedAt: Date;
  };
}

export class DNCEntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty({ enum: DNCSource })
  source: DNCSource;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  addedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  expiresAt?: Date;
}
