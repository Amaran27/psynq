import { IsUUID, IsEnum, IsNumber, IsOptional, IsArray, ArrayNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SentimentScore, EmotionType } from '../domain/sentiment.domain';

export class CreateSentimentDto {
  @ApiPropertyOptional({ description: 'Organization ID (auto-filled from JWT)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: 'Transcription ID to analyze' })
  @IsUUID()
  transcriptionId: string;

  @ApiPropertyOptional({ description: 'Specific segment ID (optional, for segment-level analysis)' })
  @IsOptional()
  @IsUUID()
  segmentId?: string;

  @ApiPropertyOptional({ description: 'Call ID for correlation' })
  @IsOptional()
  @IsUUID()
  callId?: string;

  @ApiProperty({ description: 'Sentiment score value (-1 to 1)', example: 0.75 })
  @IsNumber()
  @Min(-1)
  @Max(1)
  scoreValue: number;

  @ApiProperty({ description: 'Sentiment magnitude (intensity, ≥0)', example: 0.8 })
  @IsNumber()
  @Min(0)
  magnitude: number;

  @ApiPropertyOptional({ description: 'Detected emotion', enum: EmotionType })
  @IsOptional()
  @IsEnum(EmotionType)
  emotion?: EmotionType;

  @ApiPropertyOptional({ description: 'Emotion detection confidence (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  emotionConfidence?: number;

  @ApiPropertyOptional({ description: 'Extracted keywords', type: [String] })
  @IsOptional()
  @IsArray()
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Extracted entities with sentiment' })
  @IsOptional()
  @IsArray()
  entities?: Array<{ text: string; type: string; sentiment?: number }>;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON)' })
  @IsOptional()
  metadata?: Record<string, any>;
}
