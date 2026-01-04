import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CrmProvider, SyncDirection } from '../../infrastructure/persistence/crm-integration.entity';

export class SyncConfigDto {
  @ApiPropertyOptional({ enum: SyncDirection, description: 'Sync direction' })
  @IsEnum(SyncDirection)
  @IsOptional()
  syncDirection?: SyncDirection;

  @ApiPropertyOptional({ description: 'Sync interval in minutes', minimum: 5, maximum: 10080 })
  @IsNumber()
  @Min(5)
  @Max(10080)
  @IsOptional()
  syncInterval?: number;

  @ApiPropertyOptional({ description: 'Enable contact synchronization' })
  @IsBoolean()
  @IsOptional()
  enableContactSync?: boolean;

  @ApiPropertyOptional({ description: 'Enable lead synchronization' })
  @IsBoolean()
  @IsOptional()
  enableLeadSync?: boolean;

  @ApiPropertyOptional({ description: 'Enable account synchronization' })
  @IsBoolean()
  @IsOptional()
  enableAccountSync?: boolean;

  @ApiPropertyOptional({ description: 'Enable call logging' })
  @IsBoolean()
  @IsOptional()
  enableCallLogging?: boolean;

  @ApiPropertyOptional({ description: 'Enable task creation' })
  @IsBoolean()
  @IsOptional()
  enableTaskCreation?: boolean;

  @ApiPropertyOptional({ description: 'Custom field mappings' })
  @IsObject()
  @IsOptional()
  customFieldMappings?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Sync filters' })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}

export class CreateCrmIntegrationDto {
  @ApiProperty({ description: 'Organization UUID' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ enum: CrmProvider, description: 'CRM provider type' })
  @IsEnum(CrmProvider)
  @IsNotEmpty()
  provider: CrmProvider;

  @ApiProperty({ description: 'Integration name', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Integration description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'OAuth client ID' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'OAuth client secret' })
  @IsString()
  @IsOptional()
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'Sync configuration', type: SyncConfigDto })
  @ValidateNested()
  @Type(() => SyncConfigDto)
  @IsOptional()
  syncConfig?: SyncConfigDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
