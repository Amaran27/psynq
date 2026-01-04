import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  SENTIMENT_REPOSITORY_PORT,
  SentimentRepository,
  TRANSCRIPTION_REPOSITORY_PORT,
  TranscriptionRepository,
} from '../domain/ports';
import { Sentiment, SentimentScore, EmotionType } from '../domain/sentiment.domain';
import { CreateSentimentDto } from '../dto';

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(
    @Inject(SENTIMENT_REPOSITORY_PORT)
    private readonly sentimentRepository: SentimentRepository,
    @Inject(TRANSCRIPTION_REPOSITORY_PORT)
    private readonly transcriptionRepository: TranscriptionRepository,
  ) {}

  async create(dto: CreateSentimentDto): Promise<Sentiment> {
    const sentiment = new Sentiment(
      crypto.randomUUID(),
      dto.organizationId!,
      dto.transcriptionId,
      dto.scoreValue,
      dto.magnitude,
      dto.segmentId,
      dto.callId,
      dto.emotion,
      dto.emotionConfidence,
      dto.keywords || [],
      dto.entities || [],
      dto.metadata,
    );

    sentiment.validate();
    return this.sentimentRepository.create(sentiment);
  }

  async findById(id: string): Promise<Sentiment> {
    const sentiment = await this.sentimentRepository.findById(id);
    if (!sentiment) {
      throw new NotFoundException(`Sentiment with ID ${id} not found`);
    }
    return sentiment;
  }

  async findAll(filter: any): Promise<Sentiment[]> {
    return this.sentimentRepository.findAll(filter);
  }

  async findByOrganization(organizationId: string): Promise<Sentiment[]> {
    return this.sentimentRepository.findByOrganization(organizationId);
  }

  async findByTranscription(transcriptionId: string): Promise<Sentiment[]> {
    return this.sentimentRepository.findByTranscription(transcriptionId);
  }

  async findByCall(callId: string): Promise<Sentiment[]> {
    return this.sentimentRepository.findByCall(callId);
  }

  async findNegativeCalls(organizationId: string): Promise<Sentiment[]> {
    return this.sentimentRepository.findNegative(organizationId);
  }

  async findPositiveCalls(organizationId: string): Promise<Sentiment[]> {
    return this.sentimentRepository.findPositive(organizationId);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists
    await this.sentimentRepository.delete(id);
  }

  async analyzeSentiment(transcriptionId: string): Promise<Sentiment> {
    const transcription = await this.transcriptionRepository.findById(transcriptionId);
    if (!transcription) {
      throw new NotFoundException(`Transcription ${transcriptionId} not found`);
    }

    if (!transcription.isCompleted() || !transcription.text) {
      throw new Error(`Transcription ${transcriptionId} not completed`);
    }

    this.logger.log(`Analyzing sentiment for transcription ${transcriptionId}`);

    // TODO: Integrate real sentiment analysis library
    // Options: natural, sentiment, Google NLP API, Azure Text Analytics
    const { scoreValue, magnitude, emotion, emotionConfidence, keywords, entities } =
      this.performSentimentAnalysis(transcription.text);

    const sentiment = new Sentiment(
      crypto.randomUUID(),
      transcription.organizationId,
      transcription.id,
      scoreValue,
      magnitude,
      undefined,
      transcription.callId,
      emotion,
      emotionConfidence,
      keywords,
      entities,
    );

    sentiment.validate();
    return this.sentimentRepository.create(sentiment);
  }

  private performSentimentAnalysis(text: string): {
    scoreValue: number;
    magnitude: number;
    emotion: EmotionType;
    emotionConfidence: number;
    keywords: string[];
    entities: Array<{ text: string; type: string; sentiment?: number }>;
  } {
    // Placeholder: Simple keyword-based sentiment
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'disappointed', 'frustrated'];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word)) positiveCount++;
    }

    for (const word of negativeWords) {
      if (lowerText.includes(word)) negativeCount++;
    }

    const totalWords = positiveCount + negativeCount;
    let scoreValue = 0;

    if (totalWords > 0) {
      scoreValue = (positiveCount - negativeCount) / totalWords;
    }

    const magnitude = totalWords > 0 ? Math.min(totalWords / 10, 1.0) : 0.1;

    // Determine emotion
    let emotion = EmotionType.NEUTRAL;
    let emotionConfidence = 0.5;

    if (scoreValue > 0.4) {
      emotion = EmotionType.JOY;
      emotionConfidence = 0.8;
    } else if (scoreValue < -0.4) {
      emotion = EmotionType.ANGER;
      emotionConfidence = 0.75;
    }

    // Extract keywords (simple: top sentiment words found)
    const keywords: string[] = [];
    for (const word of positiveWords) {
      if (lowerText.includes(word)) keywords.push(word);
    }
    for (const word of negativeWords) {
      if (lowerText.includes(word)) keywords.push(word);
    }

    // Extract entities (placeholder)
    const entities: Array<{ text: string; type: string; sentiment?: number }> = [];

    return { scoreValue, magnitude, emotion, emotionConfidence, keywords, entities };
  }

  async getSentimentStats(organizationId: string): Promise<any> {
    const all = await this.sentimentRepository.findByOrganization(organizationId);

    const stats = {
      total: all.length,
      byScore: {} as Record<SentimentScore, number>,
      byEmotion: {} as Record<EmotionType, number>,
      avgScore: 0,
      avgMagnitude: 0,
      avgEmotionalIntensity: 0,
    };

    let totalScore = 0;
    let totalMagnitude = 0;
    let totalIntensity = 0;

    for (const s of all) {
      stats.byScore[s.score] = (stats.byScore[s.score] || 0) + 1;
      if (s.emotion) {
        stats.byEmotion[s.emotion] = (stats.byEmotion[s.emotion] || 0) + 1;
      }

      totalScore += s.scoreValue;
      totalMagnitude += s.magnitude;
      totalIntensity += s.getEmotionalIntensity();
    }

    const count = all.length || 1;
    stats.avgScore = totalScore / count;
    stats.avgMagnitude = totalMagnitude / count;
    stats.avgEmotionalIntensity = totalIntensity / count;

    return stats;
  }

  async getSentimentDistribution(organizationId: string): Promise<any> {
    const all = await this.sentimentRepository.findByOrganization(organizationId);

    const distribution = {
      veryNegative: 0,
      negative: 0,
      neutral: 0,
      positive: 0,
      veryPositive: 0,
    };

    for (const s of all) {
      switch (s.score) {
        case SentimentScore.VERY_NEGATIVE:
          distribution.veryNegative++;
          break;
        case SentimentScore.NEGATIVE:
          distribution.negative++;
          break;
        case SentimentScore.NEUTRAL:
          distribution.neutral++;
          break;
        case SentimentScore.POSITIVE:
          distribution.positive++;
          break;
        case SentimentScore.VERY_POSITIVE:
          distribution.veryPositive++;
          break;
      }
    }

    return distribution;
  }
}
