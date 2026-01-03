import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BridgeEntity, BridgeType, BridgeTechnology } from '../../entities/bridge.entity';
import { CreateBridgeDto, AddChannelToBridgeDto, PlayMediaToBridgeDto, StartBridgeRecordingDto } from '../../dtos/bridge.dto';
import { TelephonyPort } from '../../ports/telephony.port';
import { EventBusPort, PsynqEvent } from '../../ports/event-bus.port';

@Injectable()
export class BridgeService {
  constructor(
    @InjectRepository(BridgeEntity)
    private readonly bridgeRepository: Repository<BridgeEntity>,
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async createBridge(dto: CreateBridgeDto): Promise<BridgeEntity> {
    // Generate temporary bridge ID
    const bridgeId = `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const bridge = this.bridgeRepository.create({
      id: bridgeId,
      name: dto.name,
      bridgeType: dto.bridgeType || BridgeType.MIXING,
      technology: dto.technology || BridgeTechnology.SOFTMIX,
      organizationId: dto.organizationId,
      channelIds: [],
      isRecording: false,
    });

    const savedBridge = await this.bridgeRepository.save(bridge);

    // Publish event
    this.eventBus.publish({
      type: 'bridge.created',
      timestamp: new Date(),
      data: { bridgeId: savedBridge.id, organizationId: dto.organizationId },
    });

    return savedBridge;
  }

  async getBridge(bridgeId: string): Promise<BridgeEntity> {
    const bridge = await this.bridgeRepository.findOne({
      where: { id: bridgeId },
      relations: ['organization'],
    });

    if (!bridge) {
      throw new NotFoundException(`Bridge ${bridgeId} not found`);
    }

    return bridge;
  }

  async listActiveBridges(organizationId?: string): Promise<BridgeEntity[]> {
    const query = this.bridgeRepository.createQueryBuilder('bridge')
      .where('bridge.destroyedAt IS NULL');

    if (organizationId) {
      query.andWhere('bridge.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  async addChannelToBridge(bridgeId: string, dto: AddChannelToBridgeDto): Promise<BridgeEntity> {
    const bridge = await this.getBridge(bridgeId);

    if (!bridge.channelIds) {
      bridge.channelIds = [];
    }

    // Idempotent: don't add if already present
    if (!bridge.channelIds.includes(dto.channelId)) {
      bridge.channelIds.push(dto.channelId);
      await this.bridgeRepository.save(bridge);

      this.eventBus.publish({
        type: 'bridge.channel.added',
        timestamp: new Date(),
        data: { bridgeId, channelId: dto.channelId },
      });
    }

    return bridge;
  }

  async removeChannelFromBridge(bridgeId: string, channelId: string): Promise<BridgeEntity> {
    const bridge = await this.getBridge(bridgeId);

    if (bridge.channelIds) {
      bridge.channelIds = bridge.channelIds.filter(id => id !== channelId);
      await this.bridgeRepository.save(bridge);

      this.eventBus.publish({
        type: 'bridge.channel.removed',
        timestamp: new Date(),
        data: { bridgeId, channelId },
      });
    }

    return bridge;
  }

  async destroyBridge(bridgeId: string): Promise<BridgeEntity> {
    const bridge = await this.getBridge(bridgeId);

    if (bridge.destroyedAt) {
      // Idempotent: already destroyed
      return bridge;
    }

    bridge.destroyedAt = new Date();
    bridge.channelIds = [];
    const savedBridge = await this.bridgeRepository.save(bridge);

    this.eventBus.publish({
      type: 'bridge.destroyed',
      timestamp: new Date(),
      data: { bridgeId },
    });

    return savedBridge;
  }

  async playMediaToBridge(bridgeId: string, dto: PlayMediaToBridgeDto): Promise<void> {
    const bridge = await this.getBridge(bridgeId);

    if (bridge.destroyedAt) {
      throw new BadRequestException('Cannot play media to destroyed bridge');
    }

    await this.telephonyProvider.playMedia(bridgeId, dto.mediaUrl);
  }

  async startRecording(bridgeId: string, dto: StartBridgeRecordingDto): Promise<BridgeEntity> {
    const bridge = await this.getBridge(bridgeId);

    if (bridge.isRecording) {
      throw new BadRequestException('Bridge is already recording');
    }

    bridge.isRecording = true;
    bridge.recordingName = dto.name;
    const savedBridge = await this.bridgeRepository.save(bridge);

    this.eventBus.publish({
      type: 'bridge.recording.started',
      timestamp: new Date(),
      data: { bridgeId, recordingName: dto.name },
    });

    return savedBridge;
  }

  async stopRecording(bridgeId: string): Promise<BridgeEntity> {
    const bridge = await this.getBridge(bridgeId);

    if (!bridge.isRecording) {
      // Idempotent
      return bridge;
    }

    bridge.isRecording = false;
    const savedBridge = await this.bridgeRepository.save(bridge);

    this.eventBus.publish({
      type: 'bridge.recording.stopped',
      timestamp: new Date(),
      data: { bridgeId, recordingName: bridge.recordingName },
    });

    return savedBridge;
  }

  async updateBridgeFromEvent(bridgeData: Partial<BridgeEntity>): Promise<BridgeEntity> {
    let bridge = await this.bridgeRepository.findOne({ where: { id: bridgeData.id } });

    if (bridge) {
      // Update existing
      Object.assign(bridge, bridgeData);
    } else {
      // Create from webhook
      bridge = this.bridgeRepository.create(bridgeData);
    }

    return this.bridgeRepository.save(bridge);
  }
}
