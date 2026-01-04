import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum CallDisposition {
  CONNECTED = 'connected',
  NO_ANSWER = 'no_answer',
  BUSY = 'busy',
  VOICEMAIL = 'voicemail',
  FAILED = 'failed',
}

export class LogCallDto {
  @ApiProperty({ description: 'Salesforce Contact or Lead ID (WhoId)' })
  @IsString()
  @IsNotEmpty()
  contactId: string;

  @ApiProperty({ description: 'Call subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Call duration in seconds' })
  @IsNumber()
  @IsNotEmpty()
  durationSeconds: number;

  @ApiProperty({ enum: CallDisposition, description: 'Call disposition/outcome' })
  @IsEnum(CallDisposition)
  @IsNotEmpty()
  disposition: CallDisposition;

  @ApiPropertyOptional({ description: 'Call notes/description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Call date (ISO 8601)', example: '2026-01-04' })
  @IsDateString()
  @IsOptional()
  activityDate?: string;

  @ApiPropertyOptional({ description: 'Salesforce Account ID (WhatId)' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Call type (Inbound/Outbound)' })
  @IsString()
  @IsOptional()
  callType?: string;
}
