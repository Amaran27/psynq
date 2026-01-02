import {
  IsString,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update Storage Config DTO
 */
export class UpdateStorageConfigDto {
  @IsString()
  @IsIn(['minio', 's3', 'local'], {
    message: 'Provider must be one of: minio, s3, local',
  })
  provider: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

/**
 * Update Telephony Config DTO
 */
export class UpdateTelephonyConfigDto {
  @IsString()
  @IsOptional()
  @IsIn(['asterisk', 'twilio'], {
    message: 'Trunk must be one of: asterisk, twilio',
  })
  trunk?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

/**
 * Update Recording Config DTO
 */
export class UpdateRecordingConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  autoDeleteDays?: number;

  @IsString()
  @IsIn(['wav', 'mp3', 'ogg'], {
    message: 'Format must be one of: wav, mp3, ogg',
  })
  @IsOptional()
  format?: string;

  @IsString()
  @IsOptional()
  path?: string;
}

/**
 * Update Setting DTO
 */
export class UpdateSettingDto {
  @IsOptional()
  value: any;
}
