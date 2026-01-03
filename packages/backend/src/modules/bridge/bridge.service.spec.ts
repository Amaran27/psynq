import { Test, TestingModule } from '@nestjs/testing';
import { BridgeService } from './bridge.service';
import { BridgeEntity, BridgeType, BridgeTechnology } from '../../entities/bridge.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelephonyPort } from '../../ports/telephony.port';
import { EventBusPort } from '../../ports/event-bus.port';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BridgeService', () => {
  let service: BridgeService;
  let repository: jest.Mocked<Repository<BridgeEntity>>;
  let telephonyProvider: jest.Mocked<TelephonyPort>;
  let eventBus: jest.Mocked<EventBusPort>;

  const mockBridge: BridgeEntity = {
    id: 'bridge-123',
    name: 'Test Bridge',
    bridgeType: BridgeType.MIXING,
    technology: BridgeTechnology.SOFTMIX,
    organizationId: 'org-1',
    channelIds: ['ch-1', 'ch-2'],
    creatorChannelId: null,
    bridgeVars: {},
    isRecording: false,
    recordingName: null,
    createdAt: new Date(),
    destroyedAt: null,
    updatedAt: new Date(),
    organization: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BridgeService,
        {
          provide: getRepositoryToken(BridgeEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: 'TELEPHONY_PROVIDER',
          useValue: {
            playMedia: jest.fn(),
          },
        },
        {
          provide: 'EVENT_BUS',
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BridgeService>(BridgeService);
    repository = module.get(getRepositoryToken(BridgeEntity));
    telephonyProvider = module.get('TELEPHONY_PROVIDER');
    eventBus = module.get('EVENT_BUS');
  });

  describe('createBridge', () => {
    it('should create a new bridge', async () => {
      const dto = { name: 'Conference 1', bridgeType: BridgeType.MIXING };
      repository.create.mockReturnValue(mockBridge as any);
      repository.save.mockResolvedValue(mockBridge as any);

      const result = await service.createBridge(dto);

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bridge.created' }),
      );
      expect(result.name).toBe(mockBridge.name);
    });

    it('should use default values when not provided', async () => {
      const dto = {};
      repository.create.mockReturnValue(mockBridge as any);
      repository.save.mockResolvedValue(mockBridge as any);

      await service.createBridge(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bridgeType: BridgeType.MIXING,
          technology: BridgeTechnology.SOFTMIX,
        }),
      );
    });
  });

  describe('getBridge', () => {
    it('should return bridge when found', async () => {
      repository.findOne.mockResolvedValue(mockBridge as any);

      const result = await service.getBridge('bridge-123');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'bridge-123' },
        relations: ['organization'],
      });
      expect(result).toEqual(mockBridge);
    });

    it('should throw NotFoundException when bridge not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getBridge('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listActiveBridges', () => {
    it('should list all active bridges', async () => {
      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockBridge]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.listActiveBridges();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('bridge.destroyedAt IS NULL');
      expect(result).toEqual([mockBridge]);
    });

    it('should filter by organization when provided', async () => {
      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockBridge]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.listActiveBridges('org-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bridge.organizationId = :organizationId',
        { organizationId: 'org-1' },
      );
    });
  });

  describe('addChannelToBridge', () => {
    it('should add channel to bridge', async () => {
      repository.findOne.mockResolvedValue(mockBridge as any);
      repository.save.mockResolvedValue({ ...mockBridge, channelIds: ['ch-1', 'ch-2', 'ch-3'] } as any);

      const result = await service.addChannelToBridge('bridge-123', { channelId: 'ch-3' });

      expect(repository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bridge.channel.added' }),
      );
    });

    it('should be idempotent - not add if channel already exists', async () => {
      repository.findOne.mockResolvedValue(mockBridge as any);

      await service.addChannelToBridge('bridge-123', { channelId: 'ch-1' });

      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('removeChannelFromBridge', () => {
    it('should remove channel from bridge', async () => {
      repository.findOne.mockResolvedValue(mockBridge as any);
      repository.save.mockResolvedValue({ ...mockBridge, channelIds: ['ch-2'] } as any);

      const result = await service.removeChannelFromBridge('bridge-123', 'ch-1');

      expect(repository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bridge.channel.removed' }),
      );
    });
  });

  describe('destroyBridge', () => {
    it('should destroy bridge', async () => {
      repository.findOne.mockResolvedValue(mockBridge as any);
      repository.save.mockResolvedValue({ ...mockBridge, destroyedAt: new Date(), channelIds: [] } as any);

      const result = await service.destroyBridge('bridge-123');

      expect(result.destroyedAt).toBeDefined();
      expect(result.channelIds).toEqual([]);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bridge.destroyed' }),
      );
    });

    it('should be idempotent - return bridge if already destroyed', async () => {
      const destroyedBridge = { ...mockBridge, destroyedAt: new Date() };
      repository.findOne.mockResolvedValue(destroyedBridge as any);

      const result = await service.destroyBridge('bridge-123');

      expect(repository.save).not.toHaveBeenCalled();
      expect(result.destroyedAt).toBeDefined();
    });
  });

  describe('playMediaToBridge', () => {
    it('should play media to bridge', async () => {
      const activeBridge = { ...mockBridge, destroyedAt: null };
      repository.findOne.mockResolvedValue(activeBridge as any);

      await service.playMediaToBridge('bridge-123', { mediaUrl: 'sound:beep' });

      expect(telephonyProvider.playMedia).toHaveBeenCalledWith('bridge-123', 'sound:beep');
    });

    it('should throw BadRequestException if bridge is destroyed', async () => {
      const destroyedBridge = { ...mockBridge, destroyedAt: new Date() };
      repository.findOne.mockResolvedValue(destroyedBridge as any);

      await expect(
        service.playMediaToBridge('bridge-123', { mediaUrl: 'sound:beep' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startRecording', () => {
    it('should start recording', async () => {
      repository.findOne.mockResolvedValue(mockBridge as any);
      repository.save.mockResolvedValue({ ...mockBridge, isRecording: true, recordingName: 'rec-1' } as any);

      const result = await service.startRecording('bridge-123', { name: 'rec-1' });

      expect(result.isRecording).toBe(true);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bridge.recording.started' }),
      );
    });

    it('should throw BadRequestException if already recording', async () => {
      const recordingBridge = { ...mockBridge, isRecording: true };
      repository.findOne.mockResolvedValue(recordingBridge as any);

      await expect(service.startRecording('bridge-123', { name: 'rec-1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('stopRecording', () => {
    it('should stop recording', async () => {
      const recordingBridge = { ...mockBridge, isRecording: true, recordingName: 'rec-1' };
      repository.findOne.mockResolvedValue(recordingBridge as any);
      repository.save.mockResolvedValue({ ...recordingBridge, isRecording: false } as any);

      const result = await service.stopRecording('bridge-123');

      expect(result.isRecording).toBe(false);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bridge.recording.stopped' }),
      );
    });

    it('should be idempotent - return bridge if not recording', async () => {
      const notRecordingBridge = { ...mockBridge, isRecording: false };
      repository.findOne.mockResolvedValue(notRecordingBridge as any);

      const result = await service.stopRecording('bridge-123');

      expect(repository.save).not.toHaveBeenCalled();
      expect(result.isRecording).toBe(false);
    });
  });

  describe('updateBridgeFromEvent', () => {
    it('should update existing bridge', async () => {
      repository.findOne.mockResolvedValue(mockBridge as any);
      repository.save.mockResolvedValue(mockBridge as any);

      await service.updateBridgeFromEvent({ id: 'bridge-123', name: 'Updated' });

      expect(repository.save).toHaveBeenCalled();
    });

    it('should create new bridge if not exists', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockBridge as any);
      repository.save.mockResolvedValue(mockBridge as any);

      await service.updateBridgeFromEvent({ id: 'bridge-new' });

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });
});
