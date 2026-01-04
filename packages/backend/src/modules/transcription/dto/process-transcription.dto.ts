import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TranscriptionProvider } from '../domain/transcription.domain';

export class ProcessTranscriptionDto {
  @ApiProperty({ description: 'Transcription ID to process' })
  @IsUUID()
  transcriptionId: string;

  @ApiPropertyOptional({ description: 'Override provider (for retry)', enum: TranscriptionProvider })
  @IsOptional()
  @IsEnum(TranscriptionProvider)
  provider?: TranscriptionProvider;
}
