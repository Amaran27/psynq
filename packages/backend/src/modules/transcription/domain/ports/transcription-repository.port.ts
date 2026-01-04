import { Transcription } from '../transcription.domain';

export interface FindTranscriptionsFilter {
  organizationId?: string;
  callId?: string;
  recordingId?: string;
  status?: string;
  provider?: string;
  language?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TranscriptionRepository {
  create(transcription: Transcription): Promise<Transcription>;
  findById(id: string): Promise<Transcription | null>;
  findAll(filter?: FindTranscriptionsFilter): Promise<Transcription[]>;
  findByOrganization(organizationId: string): Promise<Transcription[]>;
  findByCall(callId: string): Promise<Transcription[]>;
  findByRecording(recordingId: string): Promise<Transcription | null>;
  findPending(): Promise<Transcription[]>;
  findByStatus(status: string): Promise<Transcription[]>;
  update(transcription: Transcription): Promise<Transcription>;
  delete(id: string): Promise<void>;
  count(filter?: FindTranscriptionsFilter): Promise<number>;
}

export const TRANSCRIPTION_REPOSITORY_PORT = Symbol('TRANSCRIPTION_REPOSITORY_PORT');
