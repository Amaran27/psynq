import { IsString, IsEnum, IsOptional, IsUUID, IsInt, Min, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AudioFormat, TranscriptionProvider } from '../domain/transcription.domain';

export class CreateTranscriptionDto {
  @ApiPropertyOptional({ description: 'Organization ID (auto-filled from JWT)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Call ID to associate with transcription' })
  @IsOptional()
  @IsUUID()
  callId?: string;

  @ApiPropertyOptional({ description: 'Recording ID to associate with transcription' })
  @IsOptional()
  @IsUUID()
  recordingId?: string;

  @ApiProperty({ description: 'URL to audio file (MP3, WAV, FLAC, etc.)' })
  @IsUrl()
  @IsString()
  audioUrl: string;

  @ApiProperty({ description: 'Audio file format', enum: AudioFormat })
  @IsEnum(AudioFormat)
  audioFormat: AudioFormat;

  @ApiProperty({ description: 'Audio duration in seconds' })
  @IsInt()
  @Min(0)
  audioDurationSeconds: number;

  @ApiProperty({ description: 'Audio file size in bytes' })
  @IsInt()
  @Min(0)
  audioSizeBytes: number;

  @ApiProperty({ description: 'STT provider to use', enum: TranscriptionProvider })
  @IsEnum(TranscriptionProvider)
  provider: TranscriptionProvider;

  @ApiProperty({ description: 'Language code (e.g., en, es, fr)', example: 'en' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON)' })
  @IsOptional()
  metadata?: Record<string, any>;
}
