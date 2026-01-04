import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendTemplateMessageDto {
  @ApiProperty({ description: 'Recipient phone number (E.164 format)', example: '+12025551234' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'Template name (must be pre-approved)', example: 'welcome_message' })
  @IsString()
  templateName: string;

  @ApiProperty({ description: 'Template language code', example: 'en_US' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ description: 'Template parameters (variable substitution)', type: [Object] })
  @IsOptional()
  @IsArray()
  parameters?: any[];

  @ApiPropertyOptional({ description: 'Campaign ID (for bulk campaigns)' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Contact ID' })
  @IsOptional()
  @IsString()
  contactId?: string;
}
