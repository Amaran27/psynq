import { Sentiment } from '../sentiment.domain';

export interface FindSentimentsFilter {
  organizationId?: string;
  transcriptionId?: string;
  callId?: string;
  score?: string;
  emotion?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface SentimentRepository {
  create(sentiment: Sentiment): Promise<Sentiment>;
  findById(id: string): Promise<Sentiment | null>;
  findAll(filter?: FindSentimentsFilter): Promise<Sentiment[]>;
  findByOrganization(organizationId: string): Promise<Sentiment[]>;
  findByTranscription(transcriptionId: string): Promise<Sentiment[]>;
  findByCall(callId: string): Promise<Sentiment[]>;
  findByScore(score: string): Promise<Sentiment[]>;
  findNegative(organizationId: string): Promise<Sentiment[]>;
  findPositive(organizationId: string): Promise<Sentiment[]>;
  update(sentiment: Sentiment): Promise<Sentiment>;
  delete(id: string): Promise<void>;
  count(filter?: FindSentimentsFilter): Promise<number>;
}

export const SENTIMENT_REPOSITORY_PORT = Symbol('SENTIMENT_REPOSITORY_PORT');
