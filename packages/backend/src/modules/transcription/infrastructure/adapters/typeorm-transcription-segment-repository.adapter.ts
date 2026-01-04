import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TranscriptionSegmentRepository, FindSegmentsFilter } from '../../domain/ports/transcription-segment-repository.port';
import { TranscriptionSegment } from '../../domain/transcription-segment.domain';
import { TranscriptionSegmentEntity } from '../persistence/typeorm/entities/transcription-segment.entity';

@Injectable()
export class TypeOrmTranscriptionSegmentRepositoryAdapter implements TranscriptionSegmentRepository {
  constructor(
    @InjectRepository(TranscriptionSegmentEntity)
    private readonly repository: Repository<TranscriptionSegmentEntity>,
  ) {}

  async create(segment: TranscriptionSegment): Promise<TranscriptionSegment> {
    const entity = this.toEntity(segment);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async createMany(segments: TranscriptionSegment[]): Promise<TranscriptionSegment[]> {
    const entities = segments.map((segment) => this.toEntity(segment));
    const saved = await this.repository.save(entities);
    return saved.map((entity) => this.toDomain(entity));
  }

  async findById(id: string): Promise<TranscriptionSegment | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindSegmentsFilter): Promise<TranscriptionSegment[]> {
    const queryBuilder = this.repository.createQueryBuilder('segment');

    if (filter?.transcriptionId) {
      queryBuilder.andWhere('segment.transcriptionId = :transcriptionId', {
        transcriptionId: filter.transcriptionId,
      });
    }
    if (filter?.speaker) {
      queryBuilder.andWhere('segment.speaker = :speaker', { speaker: filter.speaker });
    }
    if (filter?.minConfidence !== undefined) {
      queryBuilder.andWhere('segment.confidence >= :minConfidence', { minConfidence: filter.minConfidence });
    }
    if (filter?.startTime !== undefined) {
      queryBuilder.andWhere('segment.startTime >= :startTime', { startTime: filter.startTime });
    }
    if (filter?.endTime !== undefined) {
      queryBuilder.andWhere('segment.endTime <= :endTime', { endTime: filter.endTime });
    }

    queryBuilder.orderBy('segment.segmentIndex', 'ASC');
    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByTranscription(transcriptionId: string): Promise<TranscriptionSegment[]> {
    const entities = await this.repository.find({
      where: { transcriptionId },
      order: { segmentIndex: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findBySpeaker(transcriptionId: string, speaker: string): Promise<TranscriptionSegment[]> {
    const entities = await this.repository.find({
      where: { transcriptionId, speaker },
      order: { segmentIndex: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByTimeRange(transcriptionId: string, startTime: number, endTime: number): Promise<TranscriptionSegment[]> {
    const entities = await this.repository
      .createQueryBuilder('segment')
      .where('segment.transcriptionId = :transcriptionId', { transcriptionId })
      .andWhere('segment.startTime >= :startTime', { startTime })
      .andWhere('segment.endTime <= :endTime', { endTime })
      .orderBy('segment.segmentIndex', 'ASC')
      .getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(segment: TranscriptionSegment): Promise<TranscriptionSegment> {
    const entity = this.toEntity(segment);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByTranscription(transcriptionId: string): Promise<void> {
    await this.repository.delete({ transcriptionId });
  }

  async count(filter?: FindSegmentsFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('segment');

    if (filter?.transcriptionId) {
      queryBuilder.andWhere('segment.transcriptionId = :transcriptionId', {
        transcriptionId: filter.transcriptionId,
      });
    }

    return queryBuilder.getCount();
  }

  private toEntity(domain: TranscriptionSegment): TranscriptionSegmentEntity {
    const entity = new TranscriptionSegmentEntity();
    entity.id = domain.id;
    entity.transcriptionId = domain.transcriptionId;
    entity.segmentIndex = domain.segmentIndex;
    entity.startTime = domain.startTime;
    entity.endTime = domain.endTime;
    entity.text = domain.text;
    entity.confidence = domain.confidence;
    entity.speaker = domain.speaker || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: TranscriptionSegmentEntity): TranscriptionSegment {
    return new TranscriptionSegment(
      entity.id,
      entity.transcriptionId,
      entity.segmentIndex,
      entity.startTime,
      entity.endTime,
      entity.text,
      entity.confidence,
      entity.speaker ?? undefined,
      entity.metadata ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
