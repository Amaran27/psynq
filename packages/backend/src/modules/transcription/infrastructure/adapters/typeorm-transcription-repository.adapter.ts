import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranscriptionRepository, FindTranscriptionsFilter } from '../../domain/ports/transcription-repository.port';
import { Transcription, TranscriptionStatus } from '../../domain/transcription.domain';
import { TranscriptionEntity } from '../persistence/typeorm/entities/transcription.entity';

@Injectable()
export class TypeOrmTranscriptionRepositoryAdapter implements TranscriptionRepository {
  constructor(
    @InjectRepository(TranscriptionEntity)
    private readonly repository: Repository<TranscriptionEntity>,
  ) {}

  async create(transcription: Transcription): Promise<Transcription> {
    const entity = this.toEntity(transcription);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Transcription | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filter?: FindTranscriptionsFilter): Promise<Transcription[]> {
    const queryBuilder = this.repository.createQueryBuilder('transcription');

    if (filter?.organizationId) {
      queryBuilder.andWhere('transcription.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }
    if (filter?.callId) {
      queryBuilder.andWhere('transcription.callId = :callId', { callId: filter.callId });
    }
    if (filter?.recordingId) {
      queryBuilder.andWhere('transcription.recordingId = :recordingId', { recordingId: filter.recordingId });
    }
    if (filter?.status) {
      queryBuilder.andWhere('transcription.status = :status', { status: filter.status });
    }
    if (filter?.provider) {
      queryBuilder.andWhere('transcription.provider = :provider', { provider: filter.provider });
    }
    if (filter?.language) {
      queryBuilder.andWhere('transcription.language = :language', { language: filter.language });
    }
    if (filter?.startDate) {
      queryBuilder.andWhere('transcription.createdAt >= :startDate', { startDate: filter.startDate });
    }
    if (filter?.endDate) {
      queryBuilder.andWhere('transcription.createdAt <= :endDate', { endDate: filter.endDate });
    }

    queryBuilder.orderBy('transcription.createdAt', 'DESC');
    const entities = await queryBuilder.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByOrganization(organizationId: string): Promise<Transcription[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByCall(callId: string): Promise<Transcription[]> {
    const entities = await this.repository.find({
      where: { callId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByRecording(recordingId: string): Promise<Transcription | null> {
    const entity = await this.repository.findOne({
      where: { recordingId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findPending(): Promise<Transcription[]> {
    const entities = await this.repository.find({
      where: { status: TranscriptionStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByStatus(status: string): Promise<Transcription[]> {
    const entities = await this.repository.find({
      where: { status: status as TranscriptionStatus },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(transcription: Transcription): Promise<Transcription> {
    const entity = this.toEntity(transcription);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(filter?: FindTranscriptionsFilter): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('transcription');

    if (filter?.organizationId) {
      queryBuilder.andWhere('transcription.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }
    if (filter?.status) {
      queryBuilder.andWhere('transcription.status = :status', { status: filter.status });
    }

    return queryBuilder.getCount();
  }

  private toEntity(domain: Transcription): TranscriptionEntity {
    const entity = new TranscriptionEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.callId = domain.callId || null;
    entity.recordingId = domain.recordingId || null;
    entity.audioUrl = domain.audioUrl;
    entity.audioFormat = domain.audioFormat;
    entity.audioDurationSeconds = domain.audioDurationSeconds;
    entity.audioSizeBytes = domain.audioSizeBytes;
    entity.status = domain.status;
    entity.provider = domain.provider;
    entity.language = domain.language;
    entity.text = domain.text || null;
    entity.confidence = domain.confidence || null;
    entity.processingTimeMs = domain.processingTimeMs || null;
    entity.startedAt = domain.startedAt || null;
    entity.completedAt = domain.completedAt || null;
    entity.errorMessage = domain.errorMessage || null;
    entity.metadata = domain.metadata || null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  private toDomain(entity: TranscriptionEntity): Transcription {
    return new Transcription(
      entity.id,
      entity.organizationId,
      entity.audioUrl,
      entity.audioFormat,
      entity.audioDurationSeconds,
      entity.audioSizeBytes,
      entity.provider,
      entity.language,
      entity.callId ?? undefined,
      entity.recordingId ?? undefined,
      entity.metadata ?? undefined,
      entity.status,
      entity.text ?? undefined,
      entity.confidence ?? undefined,
      entity.processingTimeMs ?? undefined,
      entity.startedAt ?? undefined,
      entity.completedAt ?? undefined,
      entity.errorMessage ?? undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
