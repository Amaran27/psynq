import { IsString, IsEnum, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactStatus } from '../domain/whatsapp-contact.domain';

export class CreateContactDto {
  @ApiPropertyOptional({ description: 'Organization ID (auto-filled from JWT)' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Phone number (E.164 format)', example: '+12025551234' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Contact status', enum: ContactStatus })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiPropertyOptional({ description: 'Tags for contact segmentation', type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom fields (key-value pairs)' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
