import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  TRANSCRIPTION_REPOSITORY_PORT,
  TranscriptionRepository,
  TRANSCRIPTION_SEGMENT_REPOSITORY_PORT,
  TranscriptionSegmentRepository,
  STT_PROVIDER_PORT,
  STTProvider,
} from '../domain/ports';
import { Transcription, TranscriptionStatus } from '../domain/transcription.domain';
import { TranscriptionSegment } from '../domain/transcription-segment.domain';
import { CreateTranscriptionDto, UpdateTranscriptionDto } from '../dto';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    @Inject(TRANSCRIPTION_REPOSITORY_PORT)
    private readonly transcriptionRepository: TranscriptionRepository,
    @Inject(TRANSCRIPTION_SEGMENT_REPOSITORY_PORT)
    private readonly segmentRepository: TranscriptionSegmentRepository,
    @Inject(STT_PROVIDER_PORT)
    private readonly sttProvider: STTProvider,
    private readonly httpService: HttpService,
  ) {}

  async create(dto: CreateTranscriptionDto): Promise<Transcription> {
    const transcription = new Transcription(
      crypto.randomUUID(),
      dto.organizationId!,
      dto.audioUrl,
      dto.audioFormat,
      dto.audioDurationSeconds,
      dto.audioSizeBytes,
      dto.provider,
      dto.language,
      dto.callId,
      dto.recordingId,
      dto.metadata,
    );

    transcription.validate();
    return this.transcriptionRepository.create(transcription);
  }

  async findById(id: string): Promise<Transcription> {
    const transcription = await this.transcriptionRepository.findById(id);
    if (!transcription) {
      throw new NotFoundException(`Transcription with ID ${id} not found`);
    }
    return transcription;
  }

  async findAll(filter: any): Promise<Transcription[]> {
    return this.transcriptionRepository.findAll(filter);
  }

  async findByOrganization(organizationId: string): Promise<Transcription[]> {
    return this.transcriptionRepository.findByOrganization(organizationId);
  }

  async findByCall(callId: string): Promise<Transcription[]> {
    return this.transcriptionRepository.findByCall(callId);
  }

  async findByRecording(recordingId: string): Promise<Transcription | null> {
    return this.transcriptionRepository.findByRecording(recordingId);
  }

  async findPending(): Promise<Transcription[]> {
    return this.transcriptionRepository.findPending();
  }

  async update(id: string, dto: UpdateTranscriptionDto): Promise<Transcription> {
    const transcription = await this.findById(id);

    if (dto.audioUrl) transcription.audioUrl = dto.audioUrl;
    if (dto.audioFormat) transcription.audioFormat = dto.audioFormat;
    if (dto.language) transcription.language = dto.language;
    if (dto.metadata) transcription.updateMetadata(dto.metadata);

    transcription.validate();
    return this.transcriptionRepository.update(transcription);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists
    await this.transcriptionRepository.delete(id);
  }

  async processTranscription(id: string, providerOverride?: string): Promise<Transcription> {
    const transcription = await this.findById(id);

    if (transcription.status === TranscriptionStatus.PROCESSING) {
      this.logger.warn(`Transcription ${id} already processing`);
      return transcription;
    }

    transcription.startProcessing();
    await this.transcriptionRepository.update(transcription);

    try {
      this.logger.log(`Processing transcription ${id} with provider ${transcription.provider}`);

      // Download audio if needed (or pass URL directly to provider)
      const result = await this.sttProvider.transcribe(transcription.audioUrl, {
        provider: transcription.provider,
        language: transcription.language,
        enableTimestamps: true,
        enableSpeakerDiarization: true,
      });

      // Save segments
      if (result.segments && result.segments.length > 0) {
        const segments = result.segments.map((seg, index) => {
          return new TranscriptionSegment(
            crypto.randomUUID(),
            transcription.id,
            index,
            seg.startTime,
            seg.endTime,
            seg.text,
            seg.confidence,
          );
        });

        await this.segmentRepository.createMany(segments);
      }

      // Complete transcription
      transcription.complete(result.text, result.confidence);
      await this.transcriptionRepository.update(transcription);

      this.logger.log(`Transcription ${id} completed successfully`);
      return transcription;
    } catch (error) {
      this.logger.error(`Transcription ${id} failed: ${error.message}`, error.stack);
      transcription.fail(error.message);
      await this.transcriptionRepository.update(transcription);
      throw error;
    }
  }

  async retry(id: string, providerOverride?: string): Promise<Transcription> {
    const transcription = await this.findById(id);

    if (transcription.status !== TranscriptionStatus.FAILED) {
      throw new Error(`Cannot retry transcription ${id} with status ${transcription.status}`);
    }

    transcription.retry();
    if (providerOverride) {
      // Update provider (requires domain method or direct assignment)
    }

    await this.transcriptionRepository.update(transcription);
    return this.processTranscription(id, providerOverride);
  }

  async processPendingTranscriptions(batchSize: number = 10): Promise<void> {
    const pending = await this.transcriptionRepository.findPending();
    const batch = pending.slice(0, batchSize);

    this.logger.log(`Processing ${batch.length} pending transcriptions`);

    for (const transcription of batch) {
      try {
        await this.processTranscription(transcription.id);
      } catch (error) {
        this.logger.error(
          `Failed to process transcription ${transcription.id}: ${error.message}`,
        );
      }
    }
  }

  async getSegments(transcriptionId: string): Promise<TranscriptionSegment[]> {
    return this.segmentRepository.findByTranscription(transcriptionId);
  }

  async getSegmentsByTimeRange(
    transcriptionId: string,
    startTime: number,
    endTime: number,
  ): Promise<TranscriptionSegment[]> {
    return this.segmentRepository.findByTimeRange(transcriptionId, startTime, endTime);
  }

  async getSegmentsBySpeaker(
    transcriptionId: string,
    speaker: string,
  ): Promise<TranscriptionSegment[]> {
    return this.segmentRepository.findBySpeaker(transcriptionId, speaker);
  }

  async getTranscriptionStats(organizationId: string): Promise<any> {
    const all = await this.transcriptionRepository.findByOrganization(organizationId);
    const stats = {
      total: all.length,
      byStatus: {} as Record<TranscriptionStatus, number>,
      byProvider: {} as Record<string, number>,
      avgConfidence: 0,
      avgDuration: 0,
    };

    let totalConfidence = 0;
    let totalDuration = 0;
    let completedCount = 0;

    for (const t of all) {
      stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
      stats.byProvider[t.provider] = (stats.byProvider[t.provider] || 0) + 1;

      if (t.isCompleted() && t.confidence !== undefined) {
        totalConfidence += t.confidence;
        completedCount++;
      }

      totalDuration += t.audioDurationSeconds;
    }

    stats.avgConfidence = completedCount > 0 ? totalConfidence / completedCount : 0;
    stats.avgDuration = all.length > 0 ? totalDuration / all.length : 0;

    return stats;
  }
}
