import { IsString, IsEnum, IsOptional, IsUUID, IsObject, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../domain/whatsapp-message.domain';

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Organization ID (auto-filled from JWT)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: 'Recipient phone number (E.164 format)', example: '+12025551234' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'Message type', enum: MessageType })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({ description: 'Message content (varies by type)', example: { body: 'Hello!' } })
  @IsObject()
  content: Record<string, any>;

  @ApiPropertyOptional({ description: 'Conversation ID for threading' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Contact ID' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Campaign ID (for bulk campaigns)' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Agent ID (for agent-assisted conversations)' })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Template ID (for template messages)' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Media URL (for media messages)' })
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
