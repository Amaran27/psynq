import { TranscriptionSegment } from '../transcription-segment.domain';

export interface FindSegmentsFilter {
  transcriptionId?: string;
  speaker?: string;
  minConfidence?: number;
  startTime?: number;
  endTime?: number;
}

export interface TranscriptionSegmentRepository {
  create(segment: TranscriptionSegment): Promise<TranscriptionSegment>;
  createMany(segments: TranscriptionSegment[]): Promise<TranscriptionSegment[]>;
  findById(id: string): Promise<TranscriptionSegment | null>;
  findAll(filter?: FindSegmentsFilter): Promise<TranscriptionSegment[]>;
  findByTranscription(transcriptionId: string): Promise<TranscriptionSegment[]>;
  findBySpeaker(transcriptionId: string, speaker: string): Promise<TranscriptionSegment[]>;
  findByTimeRange(transcriptionId: string, startTime: number, endTime: number): Promise<TranscriptionSegment[]>;
  update(segment: TranscriptionSegment): Promise<TranscriptionSegment>;
  delete(id: string): Promise<void>;
  deleteByTranscription(transcriptionId: string): Promise<void>;
  count(filter?: FindSegmentsFilter): Promise<number>;
}

export const TRANSCRIPTION_SEGMENT_REPOSITORY_PORT = Symbol('TRANSCRIPTION_SEGMENT_REPOSITORY_PORT');
