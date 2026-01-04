import { IsString, IsEnum, IsArray, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateCategory, TemplateLanguage } from '../domain/whatsapp-template.domain';

export class CreateTemplateDto {
  @ApiPropertyOptional({ description: 'Organization ID (auto-filled from JWT)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: 'Template name (lowercase letters, numbers, underscores)', example: 'order_confirmation' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template category', enum: TemplateCategory })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ description: 'Template language', enum: TemplateLanguage })
  @IsEnum(TemplateLanguage)
  language: TemplateLanguage;

  @ApiProperty({ description: 'Template components (header, body, footer, buttons)', type: [Object] })
  @IsArray()
  components: any[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
