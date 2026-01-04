import { IsUUID, IsInt, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTranscriptionSegmentDto {
  @ApiProperty({ description: 'Transcription ID this segment belongs to' })
  @IsUUID()
  transcriptionId: string;

  @ApiProperty({ description: 'Segment index (0-based)' })
  @IsInt()
  @Min(0)
  segmentIndex: number;

  @ApiProperty({ description: 'Segment start time in seconds' })
  @IsNumber()
  @Min(0)
  startTime: number;

  @ApiProperty({ description: 'Segment end time in seconds' })
  @IsNumber()
  @Min(0)
  endTime: number;

  @ApiProperty({ description: 'Transcribed text for this segment' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'Speaker identifier' })
  @IsOptional()
  @IsString()
  speaker?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON)' })
  @IsOptional()
  metadata?: Record<string, any>;
}
