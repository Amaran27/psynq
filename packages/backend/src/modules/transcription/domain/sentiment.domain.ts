export enum SentimentScore {
  VERY_NEGATIVE = 'very_negative',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  POSITIVE = 'positive',
  VERY_POSITIVE = 'very_positive',
}

export enum EmotionType {
  ANGER = 'anger',
  DISGUST = 'disgust',
  FEAR = 'fear',
  JOY = 'joy',
  SADNESS = 'sadness',
  SURPRISE = 'surprise',
  NEUTRAL = 'neutral',
}

export class Sentiment {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly transcriptionId: string,
    public scoreValue: number,
    public magnitude: number,
    public readonly segmentId?: string,
    public readonly callId?: string,
    public emotion?: EmotionType,
    public emotionConfidence?: number,
    public keywords: string[] = [],
    public entities: Array<{ text: string; type: string; sentiment?: number }> = [],
    public metadata?: Record<string, any>,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {
    this.score = Sentiment.fromScoreValue(scoreValue);
    this.validate();
  }
  
  public score: SentimentScore;

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Sentiment ID is required');
    }
    if (!this.organizationId || this.organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }
    if (!this.transcriptionId || this.transcriptionId.trim() === '') {
      throw new Error('Transcription ID is required');
    }
    if (this.scoreValue < -1 || this.scoreValue > 1) {
      throw new Error('Score value must be between -1 and 1');
    }
    if (this.magnitude < 0) {
      throw new Error('Magnitude must be non-negative');
    }
    if (this.emotionConfidence !== undefined && (this.emotionConfidence < 0 || this.emotionConfidence > 1)) {
      throw new Error('Emotion confidence must be between 0 and 1');
    }
  }

  static fromScoreValue(scoreValue: number): SentimentScore {
    if (scoreValue <= -0.6) return SentimentScore.VERY_NEGATIVE;
    if (scoreValue <= -0.2) return SentimentScore.NEGATIVE;
    if (scoreValue < 0.2) return SentimentScore.NEUTRAL;
    if (scoreValue < 0.6) return SentimentScore.POSITIVE;
    return SentimentScore.VERY_POSITIVE;
  }

  updateScore(scoreValue: number, magnitude: number): void {
    this.scoreValue = scoreValue;
    this.magnitude = magnitude;
    this.score = Sentiment.fromScoreValue(scoreValue);
    this.validate();
  }

  setEmotion(emotion: EmotionType, confidence: number): void {
    this.emotion = emotion;
    this.emotionConfidence = confidence;
    this.validate();
  }

  addKeyword(keyword: string): void {
    if (!this.keywords.includes(keyword)) {
      this.keywords.push(keyword);
    }
  }

  addEntity(text: string, type: string, sentiment: number): void {
    const existingEntity = this.entities.find((e) => e.text === text && e.type === type);
    if (!existingEntity) {
      this.entities.push({ text, type, sentiment });
    }
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  isPositive(): boolean {
    return this.score === SentimentScore.POSITIVE || this.score === SentimentScore.VERY_POSITIVE;
  }

  isNegative(): boolean {
    return this.score === SentimentScore.NEGATIVE || this.score === SentimentScore.VERY_NEGATIVE;
  }

  isNeutral(): boolean {
    return this.score === SentimentScore.NEUTRAL;
  }

  getEmotionalIntensity(): number {
    // Combine sentiment magnitude and emotion confidence
    const sentimentIntensity = this.magnitude;
    const emotionIntensity = this.emotionConfidence || 0;
    return (sentimentIntensity + emotionIntensity) / 2;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      transcriptionId: this.transcriptionId,
      segmentId: this.segmentId,
      callId: this.callId,
      score: this.score,
      scoreValue: this.scoreValue,
      magnitude: this.magnitude,
      emotion: this.emotion,
      emotionConfidence: this.emotionConfidence,
      emotionalIntensity: this.getEmotionalIntensity(),
      keywords: this.keywords,
      entities: this.entities,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
