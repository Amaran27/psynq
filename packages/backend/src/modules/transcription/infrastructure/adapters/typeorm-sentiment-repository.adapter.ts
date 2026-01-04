import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SentimentRepository, FindSentimentsFilter } from '../../domain/ports/sentiment-repository.port';
import { Sentiment, SentimentScore } from '../../domain/sentiment.domain';
import { SentimentEntity } from '../persistence/typeorm/entities/sentiment.entity';

@Injectable()
export class TypeOrmSentimentRepositoryAdapter implements SentimentRepository {
  constructor(
    @InjectRepository(SentimentEntity)
    private readonly repository: Repository<SentimentEntity>,
  ) {}

  async create(sentiment: Sentiment): Promise<Sentiment> {
    const entity = this.toEntity(sentiment);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Sentiment | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindSentimentsFilter): Promise<Sentiment[]> {
    const queryBuilder = this.repository.createQueryBuilder('sentiment');

    if (filter?.organizationId) {
      queryBuilder.andWhere('sentiment.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }
    if (filter?.transcriptionId) {
      queryBuilder.andWhere('sentiment.transcriptionId = :transcriptionId', {
        transcriptionId: filter.transcriptionId,
      });
    }
    if (filter?.callId) {
      queryBuilder.andWhere('sentiment.callId = :callId', { callId: filter.callId });
    }
    if (filter?.score) {
      queryBuilder.andWhere('sentiment.score = :score', { score: filter.score });
    }
    if (filter?.emotion) {
      queryBuilder.andWhere('sentiment.emotion = :emotion', { emotion: filter.emotion });
    }
    if (filter?.startDate) {
      queryBuilder.andWhere('sentiment.createdAt >= :startDate', { startDate: filter.startDate });
    }
    if (filter?.endDate) {
      queryBuilder.andWhere('sentiment.createdAt <= :endDate', { endDate: filter.endDate });
    }

    queryBuilder.orderBy('sentiment.createdAt', 'DESC');
    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByOrganization(organizationId: string): Promise<Sentiment[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByTranscription(transcriptionId: string): Promise<Sentiment[]> {
    const entities = await this.repository.find({
      where: { transcriptionId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByCall(callId: string): Promise<Sentiment[]> {
    const entities = await this.repository.find({
      where: { callId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByScore(score: string): Promise<Sentiment[]> {
    const entities = await this.repository.find({
      where: { score: score as SentimentScore },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findNegative(organizationId: string): Promise<Sentiment[]> {
    const entities = await this.repository
      .createQueryBuilder('sentiment')
      .where('sentiment.organizationId = :organizationId', { organizationId })
      .andWhere('sentiment.score IN (:...scores)', {
        scores: [SentimentScore.NEGATIVE, SentimentScore.VERY_NEGATIVE],
      })
      .orderBy('sentiment.scoreValue', 'ASC')
      .getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findPositive(organizationId: string): Promise<Sentiment[]> {
    const entities = await this.repository
      .createQueryBuilder('sentiment')
      .where('sentiment.organizationId = :organizationId', { organizationId })
      .andWhere('sentiment.score IN (:...scores)', {
        scores: [SentimentScore.POSITIVE, SentimentScore.VERY_POSITIVE],
      })
      .orderBy('sentiment.scoreValue', 'DESC')
      .getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(sentiment: Sentiment): Promise<Sentiment> {
    const entity = this.toEntity(sentiment);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindSentimentsFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('sentiment');

    if (filter?.organizationId) {
      queryBuilder.andWhere('sentiment.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }
    if (filter?.score) {
      queryBuilder.andWhere('sentiment.score = :score', { score: filter.score });
    }

    return queryBuilder.getCount();
  }

  private toEntity(domain: Sentiment): SentimentEntity {
    const entity = new SentimentEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.transcriptionId = domain.transcriptionId;
    entity.segmentId = domain.segmentId || null;
    entity.callId = domain.callId || null;
    entity.score = domain.score;
    entity.scoreValue = domain.scoreValue;
    entity.magnitude = domain.magnitude;
    entity.emotion = domain.emotion || null;
    entity.emotionConfidence = domain.emotionConfidence || null;
    entity.keywords = domain.keywords;
    entity.entities = domain.entities as Array<{ text: string; type: string; sentiment: number }>;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: SentimentEntity): Sentiment {
    return new Sentiment(
      entity.id,
      entity.organizationId,
      entity.transcriptionId,
      entity.scoreValue,
      entity.magnitude,
      entity.segmentId ?? undefined,
      entity.callId ?? undefined,
      entity.emotion ?? undefined,
      entity.emotionConfidence ?? undefined,
      entity.keywords,
      entity.entities,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
