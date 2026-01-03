import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallService } from './call.service';
import { CallEntity } from '../../entities/call.entity';
import { EventBusPort } from '../../ports/event-bus.port';
import { TelephonyPort } from '../../ports/telephony.port';
import { ConfigService } from '@nestjs/config';
import { CallParticipantService } from '../../services/call-participant.service';
import { StorageService } from '../storage/storage.service';
import { AgentStateService } from '../../services/agent-state.service';
import { BillingService } from '../../services/billing.service';
import { CallState, CallDirection } from '@psynq/core';

describe('CallService', () => {
  let service: CallService;
  let callRepository: jest.Mocked<Repository<CallEntity>>;
  let telephonyProvider: jest.Mocked<TelephonyPort>;
  let eventBus: jest.Mocked<EventBusPort>;

  const mockCallEntity = {
    id: 'call-123',
    organizationId: 'org-1',
    state: CallState.ANSWERED,
    direction: CallDirection.INBOUND,
    from: '100',
    to: '200',
    externalId: 'ext-123',
    startedAt: new Date(),
    participants: [],
  } as unknown as CallEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallService,
        {
          provide: getRepositoryToken(CallEntity),
          useValue: {
            findOneBy: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: 'EVENT_BUS',
          useValue: {
            subscribe: jest.fn(),
            publish: jest.fn(),
          },
        },
        {
          provide: 'TELEPHONY_PROVIDER',
          useValue: {
            createCall: jest.fn(),
            bridgeParticipants: jest.fn(),
            injectSupervisor: jest.fn(),
            setParticipantMuted: jest.fn(),
            setParticipantOnHold: jest.fn(),
            endCall: jest.fn(),
            getCapabilities: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: CallParticipantService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: AgentStateService, useValue: {} },
        { provide: BillingService, useValue: {} },
      ],
    }).compile();

    service = module.get<CallService>(CallService);
    callRepository = module.get(getRepositoryToken(CallEntity));
    telephonyProvider = module.get('TELEPHONY_PROVIDER');
    eventBus = module.get('EVENT_BUS');
  });

  describe('holdCall', () => {
    it('should put call on hold and update provider', async () => {
      callRepository.findOneBy.mockResolvedValue({ ...mockCallEntity, state: CallState.ANSWERED } as CallEntity);
      callRepository.save.mockResolvedValue({ ...mockCallEntity, state: CallState.ON_HOLD } as CallEntity);

      await service.holdCall('call-123');

      expect(callRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: CallState.ON_HOLD })
      );
      expect(telephonyProvider.setParticipantOnHold).toHaveBeenCalledWith(
        'org-1',
        'ext-123',
        true
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'call.updated' })
      );
    });
  });

  describe('resumeCall', () => {
    it('should resume call and update provider', async () => {
      callRepository.findOneBy.mockResolvedValue({ ...mockCallEntity, state: CallState.ON_HOLD } as CallEntity);
      callRepository.save.mockResolvedValue({ ...mockCallEntity, state: CallState.ANSWERED } as CallEntity);

      await service.resumeCall('call-123');

      expect(callRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: CallState.ANSWERED })
      );
      expect(telephonyProvider.setParticipantOnHold).toHaveBeenCalledWith(
        'org-1',
        'ext-123',
        false
      );
    });
  });

  describe('endCall', () => {
    it('should end call and notify provider', async () => {
      callRepository.findOneBy.mockResolvedValue({ ...mockCallEntity, state: CallState.ANSWERED } as CallEntity);
      callRepository.save.mockResolvedValue({ ...mockCallEntity, state: CallState.ENDED } as CallEntity);
      callRepository.find.mockResolvedValue([]); // No related calls

      await service.endCall('call-123');

      expect(callRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: CallState.ENDED })
      );
      expect(telephonyProvider.endCall).toHaveBeenCalled();
    });
  });
});
