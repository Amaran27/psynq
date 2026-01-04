import { IsString, IsBoolean, IsInt, IsOptional, IsEmail, IsUrl, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWhatsAppConfigurationDto {
  @ApiPropertyOptional({ description: 'Organization ID (auto-filled from JWT)' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Meta Business Account ID' })
  @IsString()
  businessAccountId: string;

  @ApiProperty({ description: 'WhatsApp Phone Number ID from Meta' })
  @IsString()
  phoneNumberId: string;

  @ApiProperty({ description: 'Meta API Access Token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ description: 'WhatsApp phone number in E.164 format', example: '+14155552671' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Enable WhatsApp integration', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Allow receiving messages', default: true })
  @IsOptional()
  @IsBoolean()
  allowInbound?: boolean;

  @ApiPropertyOptional({ description: 'Allow sending messages', default: true })
  @IsOptional()
  @IsBoolean()
  allowOutbound?: boolean;

  @ApiPropertyOptional({ description: 'Enable read receipts', default: false })
  @IsOptional()
  @IsBoolean()
  enableReadReceipts?: boolean;

  @ApiPropertyOptional({ description: 'Maximum messages per hour', default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  hourlyMessageLimit?: number;

  @ApiPropertyOptional({ description: 'Max retry attempts for failed messages', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetryAttempts?: number;

  @ApiPropertyOptional({ description: 'Delay between retries in milliseconds', default: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  retryDelayMs?: number;

  @ApiPropertyOptional({ description: 'API request timeout in milliseconds', default: 30000 })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(120000)
  apiTimeoutMs?: number;

  @ApiPropertyOptional({ description: 'Webhook URL for receiving messages' })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Webhook verification token' })
  @IsOptional()
  @IsString()
  webhookVerifyToken?: string;

  @ApiPropertyOptional({ description: 'Business display name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business description' })
  @IsOptional()
  @IsString()
  businessDescription?: string;

  @ApiPropertyOptional({ description: 'Business contact email' })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional({ description: 'Business website URL' })
  @IsOptional()
  @IsUrl()
  businessWebsite?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON)' })
  @IsOptional()
  metadata?: Record<string, any>;
}
