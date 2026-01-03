import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelService } from './channel.service';
import { ChannelEntity, ChannelState, ChannelDirection } from '../../entities/channel.entity';
import { EventBusPort } from '../../ports/event-bus.port';
import { TelephonyPort } from '../../ports/telephony.port';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ChannelService', () => {
  let service: ChannelService;
  let channelRepository: jest.Mocked<Repository<ChannelEntity>>;
  let telephonyProvider: jest.Mocked<TelephonyPort>;
  let eventBus: jest.Mocked<EventBusPort>;

  const mockChannelEntity: ChannelEntity = {
    id: 'PJSIP/trunk-00000001',
    organizationId: 'org-1',
    callId: 'call-123',
    bridgeId: null,
    state: ChannelState.UP,
    direction: ChannelDirection.INBOUND,
    callerName: 'John Doe',
    callerNumber: '+15551234567',
    connectedName: 'Agent Smith',
    connectedNumber: '+18005551212',
    dialedNumber: '+18005551212',
    language: 'en',
    accountCode: 'ACC001',
    channelvars: { CAMPAIGN_ID: 'camp-1' },
    providerMetadata: {},
    createdAt: new Date(),
    answeredAt: new Date(Date.now() - 5000),
    endedAt: null,
    updatedAt: new Date(),
  } as ChannelEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelService,
        {
          provide: getRepositoryToken(ChannelEntity),
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
            playAudio: jest.fn(),
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

    service = module.get<ChannelService>(ChannelService);
    channelRepository = module.get(getRepositoryToken(ChannelEntity));
    telephonyProvider = module.get('TELEPHONY_PROVIDER');
    eventBus = module.get('EVENT_BUS');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createChannel', () => {
    it('should create an outbound channel and emit event', async () => {
      const endpoint = 'PJSIP/+15559876543@trunk';
      const orgId = 'org-1';
      const callerId = '+18005551212';
      const callId = 'call-123';
      const channelvars = { AGENT_ID: 'agent-1' };

      const createdChannel = {
        ...mockChannelEntity,
        id: 'channel_123_abc',
        state: ChannelState.DOWN,
        direction: ChannelDirection.OUTBOUND,
        callerNumber: callerId,
        dialedNumber: endpoint,
        channelvars,
      };

      channelRepository.create.mockReturnValue(createdChannel as any);
      channelRepository.save.mockResolvedValue(createdChannel as any);

      const result = await service.createChannel(endpoint, orgId, callerId, callId, channelvars);

      expect(channelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          callId,
          state: ChannelState.DOWN,
          direction: ChannelDirection.OUTBOUND,
          callerNumber: callerId,
          dialedNumber: endpoint,
          channelvars,
        }),
      );
      expect(channelRepository.save).toHaveBeenCalledWith(createdChannel);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'channel.created',
          organizationId: orgId,
          payload: { channelId: createdChannel.id, callId },
        }),
      );
      expect(result).toEqual(createdChannel);
    });

    it('should create channel with null organizationId when not provided', async () => {
      const endpoint = 'PJSIP/trunk';
      channelRepository.create.mockReturnValue({ id: 'ch-1' } as any);
      channelRepository.save.mockResolvedValue({ id: 'ch-1' } as any);

      await service.createChannel(endpoint, null);

      expect(channelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: undefined,
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'system',
        }),
      );
    });
  });

  describe('getChannel', () => {
    it('should return channel with relations', async () => {
      channelRepository.findOne.mockResolvedValue(mockChannelEntity);

      const result = await service.getChannel('PJSIP/trunk-00000001');

      expect(channelRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'PJSIP/trunk-00000001' },
        relations: ['organization', 'call'],
      });
      expect(result).toEqual(mockChannelEntity);
    });

    it('should throw NotFoundException when channel not found', async () => {
      channelRepository.findOne.mockResolvedValue(null);

      await expect(service.getChannel('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getChannel('nonexistent')).rejects.toThrow(
        'Channel nonexistent not found',
      );
    });
  });

  describe('listActiveChannels', () => {
    it('should return all active channels without organizationId filter', async () => {
      const mockChannels = [mockChannelEntity, { ...mockChannelEntity, id: 'ch-2' }];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockChannels),
      };

      channelRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.listActiveChannels();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('channel.endedAt IS NULL');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('channel.createdAt', 'DESC');
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(mockChannels);
    });

    it('should filter by organizationId when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockChannelEntity]),
      };

      channelRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.listActiveChannels('org-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'channel.organizationId = :organizationId',
        { organizationId: 'org-1' },
      );
    });
  });

  describe('answerChannel', () => {
    it('should answer a ringing channel and emit event', async () => {
      const ringingChannel = {
        ...mockChannelEntity,
        state: ChannelState.RINGING,
        answeredAt: null,
      };
      const answeredChannel = {
        ...ringingChannel,
        state: ChannelState.UP,
        answeredAt: expect.any(Date),
      };

      channelRepository.findOne.mockResolvedValue(ringingChannel as any);
      channelRepository.save.mockResolvedValue(answeredChannel as any);

      const result = await service.answerChannel('PJSIP/trunk-00000001', 'org-1');

      expect(channelRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ChannelState.UP,
          answeredAt: expect.any(Date),
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'channel.answered',
          organizationId: 'org-1',
          payload: { channelId: 'PJSIP/trunk-00000001', callId: 'call-123' },
        }),
      );
      expect(result).toEqual(answeredChannel);
    });

    it('should be idempotent - return already answered channel', async () => {
      const answeredChannel = { ...mockChannelEntity, state: ChannelState.UP };
      channelRepository.findOne.mockResolvedValue(answeredChannel as any);

      const result = await service.answerChannel('PJSIP/trunk-00000001', 'org-1');

      expect(channelRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(answeredChannel);
    });

    it('should throw BadRequestException when channel not in valid state', async () => {
      const downChannel = { ...mockChannelEntity, state: ChannelState.DOWN };
      channelRepository.findOne.mockResolvedValue(downChannel as any);

      await expect(service.answerChannel('ch-1', 'org-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.answerChannel('ch-1', 'org-1')).rejects.toThrow(
        'Cannot answer channel in state: Down',
      );
    });
  });

  describe('hangupChannel', () => {
    it('should hang up an active channel and emit event', async () => {
      const activeChannel = { ...mockChannelEntity, endedAt: null };
      const hungupChannel = {
        ...activeChannel,
        state: ChannelState.DOWN,
        endedAt: expect.any(Date),
      };

      channelRepository.findOne.mockResolvedValue(activeChannel as any);
      channelRepository.save.mockResolvedValue(hungupChannel as any);

      const result = await service.hangupChannel('ch-1', 'org-1', 'normal-clearing');

      expect(channelRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ChannelState.DOWN,
          endedAt: expect.any(Date),
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'channel.hungup',
          organizationId: 'org-1',
          payload: { channelId: 'ch-1', callId: 'call-123', reason: 'normal-clearing' },
        }),
      );
      expect(result).toEqual(hungupChannel);
    });

    it('should be idempotent - return already ended channel', async () => {
      const endedChannel = { ...mockChannelEntity, endedAt: new Date() };
      channelRepository.findOne.mockResolvedValue(endedChannel as any);

      const result = await service.hangupChannel('ch-1', 'org-1');

      expect(channelRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(endedChannel);
    });

    it('should handle channel without callId', async () => {
      const channelNoCall = { ...mockChannelEntity, callId: null, endedAt: null };
      channelRepository.findOne.mockResolvedValue(channelNoCall as any);
      channelRepository.save.mockResolvedValue({
        ...channelNoCall,
        state: ChannelState.DOWN,
        endedAt: new Date(),
      } as any);

      const result = await service.hangupChannel('ch-1', 'org-1');

      expect(result.state).toBe(ChannelState.DOWN);
      expect(result.endedAt).toBeDefined();
    });
  });

  describe('playMedia', () => {
    it('should play media to an answered channel', async () => {
      channelRepository.findOne.mockResolvedValue(mockChannelEntity);
      telephonyProvider.playAudio.mockResolvedValue(undefined);

      await service.playMedia('ch-1', 'org-1', 'sound:demo-congrats', 'en');

      expect(telephonyProvider.playAudio).toHaveBeenCalledWith('org-1', 'ch-1', 'sound:demo-congrats');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'channel.media_played',
          payload: { channelId: 'ch-1', media: 'sound:demo-congrats' },
        }),
      );
    });

    it('should throw BadRequestException when channel not answered', async () => {
      const downChannel = { ...mockChannelEntity, state: ChannelState.DOWN };
      channelRepository.findOne.mockResolvedValue(downChannel as any);

      await expect(service.playMedia('ch-1', 'org-1', 'sound:test')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.playMedia('ch-1', 'org-1', 'sound:test')).rejects.toThrow(
        'Cannot play media to channel in state: Down',
      );
    });

    it('should throw NotFoundException when channel not found', async () => {
      channelRepository.findOne.mockResolvedValue(null);

      await expect(service.playMedia('nonexistent', 'org-1', 'sound:test')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('speak', () => {
    it('should speak text to an answered channel', async () => {
      channelRepository.findOne.mockResolvedValue(mockChannelEntity);

      await service.speak('ch-1', 'org-1', 'Hello world', 'en-US');

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'channel.text_spoken',
          payload: { channelId: 'ch-1', text: 'Hello world' },
        }),
      );
    });

    it('should throw BadRequestException when channel not answered', async () => {
      const ringingChannel = { ...mockChannelEntity, state: ChannelState.RINGING };
      channelRepository.findOne.mockResolvedValue(ringingChannel as any);

      await expect(service.speak('ch-1', 'org-1', 'test')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateChannelFromEvent', () => {
    it('should update existing channel with new data', async () => {
      channelRepository.findOne.mockResolvedValue(mockChannelEntity);
      const updates = { state: ChannelState.DOWN, endedAt: new Date() };
      const updatedChannel = { ...mockChannelEntity, ...updates };
      channelRepository.save.mockResolvedValue(updatedChannel as any);

      const result = await service.updateChannelFromEvent('ch-1', updates);

      expect(channelRepository.findOne).toHaveBeenCalledWith({ where: { id: 'ch-1' } });
      expect(channelRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updates),
      );
      expect(result).toEqual(updatedChannel);
    });

    it('should create new channel if not found (inbound call)', async () => {
      channelRepository.findOne.mockResolvedValue(null);
      const newChannelData = {
        id: 'new-ch-1',
        state: ChannelState.RINGING,
        direction: ChannelDirection.INBOUND,
        callerNumber: '+15551234567',
        callerName: 'Unknown',
      };
      channelRepository.create.mockReturnValue(newChannelData as any);
      channelRepository.save.mockResolvedValue(newChannelData as any);

      const result = await service.updateChannelFromEvent('new-ch-1', newChannelData);

      expect(channelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'new-ch-1', ...newChannelData }),
      );
      expect(result).toEqual(newChannelData);
    });

    it('should merge partial updates into existing channel', async () => {
      channelRepository.findOne.mockResolvedValue(mockChannelEntity);
      const partialUpdate = { state: ChannelState.RINGING };
      const merged = { ...mockChannelEntity, ...partialUpdate };
      channelRepository.save.mockResolvedValue(merged as any);

      const result = await service.updateChannelFromEvent('ch-1', partialUpdate);

      expect(result.state).toBe(ChannelState.RINGING);
      expect(result.callerNumber).toBe(mockChannelEntity.callerNumber);
    });
  });
});
