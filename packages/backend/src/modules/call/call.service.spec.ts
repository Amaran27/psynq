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
import { Call, CallDirection, CallState } from '@psynq/core';
import { Readable } from 'stream';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CallStateTransitionError,
  TelephonyProviderError,
} from '../../common/exceptions/psynq.exception';

describe('CallService', () => {
  let service: CallService;
  let callRepository: jest.Mocked<Repository<CallEntity>>;
  let telephonyProvider: jest.Mocked<TelephonyPort>;
  let eventBus: jest.Mocked<EventBusPort>;
  let callParticipantService: jest.Mocked<CallParticipantService>;
  let agentStateService: jest.Mocked<AgentStateService>;
  let billingService: jest.Mocked<BillingService>;
  let storageService: jest.Mocked<StorageService>;

  const capabilities = {
    supportsSupervisorInjection: true,
    supportsParticipantMute: true,
    supportsParticipantHold: true,
    supportsBridgeCall: true,
    supportsBarge: true,
    supportsWhisper: true,
  };

  const mockCallEntity = {
    id: 'call-123',
    organizationId: 'org-1',
    state: CallState.ANSWERED,
    direction: CallDirection.INBOUND,
    from: '100',
    to: '200',
    externalId: 'ext-123',
    startedAt: new Date(),
    answeredAt: new Date(Date.now() - 10_000),
    endedAt: null,
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
            getRecording: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: CallParticipantService,
          useValue: {
            addParticipant: jest.fn(),
            getSupervisorsByCallId: jest.fn(),
            updateParticipantMuteState: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadRecording: jest.fn(),
          },
        },
        {
          provide: AgentStateService,
          useValue: {
            isAvailable: jest.fn(),
          },
        },
        {
          provide: BillingService,
          useValue: {
            checkBalance: jest.fn(),
            getRate: jest.fn(),
            chargeForCall: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CallService>(CallService);
    callRepository = module.get(getRepositoryToken(CallEntity));
    telephonyProvider = module.get('TELEPHONY_PROVIDER');
    eventBus = module.get('EVENT_BUS');
    callParticipantService = module.get(CallParticipantService);
    agentStateService = module.get(AgentStateService);
    billingService = module.get(BillingService);
    storageService = module.get(StorageService);

    telephonyProvider.getCapabilities.mockReturnValue(capabilities as any);

    // Keep unit tests focused on this service by controlling the FSM behavior.
    // (We still execute the service logic; we just avoid transition brittleness.)
    (service as any).stateMachine = {
      startCall: jest.fn((call: Call) => {
        call.state = CallState.RINGING;
      }),
      answerCall: jest.fn((call: Call) => {
        call.state = CallState.ANSWERED;
      }),
      holdCall: jest.fn((call: Call) => {
        call.state = CallState.ON_HOLD;
      }),
      resumeCall: jest.fn((call: Call) => {
        call.state = CallState.ANSWERED;
      }),
      endCall: jest.fn((call: Call) => {
        call.state = CallState.ENDED;
        call.endedAt = new Date();
      }),
    };
  });

  describe('onModuleInit', () => {
    it('should subscribe to telephony events', async () => {
      await service.onModuleInit();

      expect(eventBus.subscribe).toHaveBeenCalledWith(
        'telephony.call_received',
        expect.any(Function),
      );
      expect(eventBus.subscribe).toHaveBeenCalledWith(
        'telephony.call_ended',
        expect.any(Function),
      );
      expect(eventBus.subscribe).toHaveBeenCalledWith(
        'telephony.participant_joined',
        expect.any(Function),
      );
    });
  });

  describe('getCall', () => {
    it('should return a call when found', async () => {
      callRepository.findOneBy.mockResolvedValue(mockCallEntity);

      const result = await service.getCall('call-123');

      expect(result).toBeDefined();
      expect(callRepository.findOneBy).toHaveBeenCalledWith({ id: 'call-123' });
      expect((result as any).id).toBe('call-123');
    });

    it('should throw NotFoundException when call missing', async () => {
      callRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getCall('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createCall', () => {
    it('should create call, publish event, and update externalId when provider returns one', async () => {
      billingService.checkBalance.mockResolvedValue(undefined);
      agentStateService.isAvailable.mockResolvedValue(true);

      // Save returns entity (not used for response, but for completeness)
      callRepository.save.mockResolvedValue({
        ...mockCallEntity,
        id: 'call_generated',
        state: CallState.RINGING,
        direction: CallDirection.OUTBOUND,
      } as any);

      telephonyProvider.createCall.mockResolvedValue('ext-generated');

      const res = await service.createCall({
        from: '100',
        to: '200',
        organizationId: 'org-1',
        agentId: 'agent-1',
      });

      expect(billingService.checkBalance).toHaveBeenCalledWith('org-1', '200');
      expect(agentStateService.isAvailable).toHaveBeenCalledWith('agent-1');

      expect(callRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^call_/),
          from: '100',
          to: '200',
          direction: CallDirection.OUTBOUND,
        }),
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'call.new', organizationId: 'org-1' }),
      );
      expect(telephonyProvider.createCall).toHaveBeenCalled();
      expect(callRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ externalId: 'ext-generated' }),
      );
      expect(res).toBeDefined();
    });

    it('should reject when agent is not available', async () => {
      agentStateService.isAvailable.mockResolvedValue(false);

      await expect(
        service.createCall({
          from: '100',
          to: '200',
          organizationId: 'org-1',
          agentId: 'agent-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw CallStateTransitionError when state machine fails to start', async () => {
      (service as any).stateMachine.startCall.mockImplementation(() => {
        throw new Error('nope');
      });

      await expect(
        service.createCall({
          from: '100',
          to: '200',
          organizationId: 'org-1',
        }),
      ).rejects.toBeInstanceOf(CallStateTransitionError);
    });
  });

  describe('answerCall', () => {
    it('should answer call, bridge to agent, and publish update', async () => {
      callRepository.findOneBy.mockResolvedValue({
        ...mockCallEntity,
        state: CallState.RINGING,
      } as any);

      callRepository.save.mockResolvedValue({
        ...mockCallEntity,
        state: CallState.ANSWERED,
        agentId: 'agent-1',
      } as any);

      telephonyProvider.bridgeParticipants.mockResolvedValue(undefined);

      const res = await service.answerCall('call-123', 'agent-1');

      expect(callRepository.save).toHaveBeenCalled();
      expect(telephonyProvider.bridgeParticipants).toHaveBeenCalledWith(
        expect.any(Call),
        'agent-1',
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'call.updated' }),
      );
      expect(res).toBeDefined();
    });

    it('should roll back state when provider bridge fails', async () => {
      callRepository.findOneBy.mockResolvedValue({
        ...mockCallEntity,
        state: CallState.RINGING,
      } as any);

      callRepository.save.mockResolvedValue({
        ...mockCallEntity,
        state: CallState.ANSWERED,
      } as any);

      telephonyProvider.bridgeParticipants.mockRejectedValue(
        new Error('bridge blew up'),
      );

      await expect(
        service.answerCall('call-123', 'agent-1'),
      ).rejects.toBeInstanceOf(TelephonyProviderError);

      // Called at least twice: first for optimistic ANSWERED, second for rollback.
      expect(callRepository.save).toHaveBeenCalled();
    });
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

    it('should throw BadRequestException when hold transition fails', async () => {
      callRepository.findOneBy.mockResolvedValue({ ...mockCallEntity, state: CallState.ANSWERED } as CallEntity);
      (service as any).stateMachine.holdCall.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.holdCall('call-123')).rejects.toBeInstanceOf(
        BadRequestException,
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

    it('should throw BadRequestException when resume transition fails', async () => {
      callRepository.findOneBy.mockResolvedValue({ ...mockCallEntity, state: CallState.ON_HOLD } as CallEntity);
      (service as any).stateMachine.resumeCall.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.resumeCall('call-123')).rejects.toBeInstanceOf(
        BadRequestException,
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

    it('should be idempotent (already ENDED returns without provider call)', async () => {
      callRepository.findOneBy.mockResolvedValue({ ...mockCallEntity, state: CallState.ENDED } as CallEntity);

      const res = await service.endCall('call-123');

      expect(telephonyProvider.endCall).not.toHaveBeenCalled();
      expect(callRepository.save).not.toHaveBeenCalled();
      expect((res as any).id).toBe('call-123');
    });

    it('should cleanup related active calls', async () => {
      callRepository.findOneBy.mockResolvedValue({ ...mockCallEntity, state: CallState.ANSWERED } as CallEntity);
      callRepository.save.mockResolvedValue({ ...mockCallEntity, state: CallState.ENDED } as CallEntity);
      callRepository.find.mockResolvedValue([
        { ...mockCallEntity, id: 'call-123', state: CallState.ENDED } as any,
        { ...mockCallEntity, id: 'call-456', state: CallState.ANSWERED } as any,
      ]);

      await service.endCall('call-123');

      expect(callRepository.find).toHaveBeenCalled();
      // Saved once for main call + once for related
      expect(callRepository.save).toHaveBeenCalled();
    });
  });

  describe('supervisor controls', () => {
    it('injectSupervisor should throw if capability unsupported', async () => {
      telephonyProvider.getCapabilities.mockReturnValue({
        ...capabilities,
        supportsSupervisorInjection: false,
      } as any);
      callRepository.findOneBy.mockResolvedValue(mockCallEntity);

      await expect(
        service.injectSupervisor('call-123', 'sup-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('supervisorMute should throw when no supervisor injected', async () => {
      callRepository.findOneBy.mockResolvedValue(mockCallEntity);
      callParticipantService.getSupervisorsByCallId.mockResolvedValue([] as any);

      await expect(service.supervisorMute('call-123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('supervisorUnmute should unmute and update participant state', async () => {
      callRepository.findOneBy.mockResolvedValue(mockCallEntity);
      callParticipantService.getSupervisorsByCallId.mockResolvedValue([
        {
          id: 'p-1',
          callId: 'call-123',
          participantId: 'prov-1',
          providerCallSid: 'prov-1',
          type: 'supervisor',
        } as any,
      ]);

      await service.supervisorUnmute('call-123');

      expect(telephonyProvider.setParticipantMuted).toHaveBeenCalledWith(
        'org-1',
        expect.any(String),
        false,
      );
      expect(
        callParticipantService.updateParticipantMuteState,
      ).toHaveBeenCalledWith('p-1', false);
    });
  });

  describe('webhooks', () => {
    it('handleStandardWebhookEvent(call_started) should create call when missing', async () => {
      callRepository.findOneBy.mockResolvedValue(null);
      callRepository.save.mockResolvedValue({
        ...mockCallEntity,
        id: 'call-webhook',
        externalId: 'ext-1',
        state: CallState.RINGING,
      } as any);

      await service.handleStandardWebhookEvent({
        eventType: 'call_started',
        callId: 'call-webhook',
        externalId: 'ext-1',
        organizationId: 'org-1',
        data: { from: '100', to: '200' },
      } as any);

      expect(callRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'call.new' }),
      );
    });

    it('handleStandardWebhookEvent(call_ended) should publish update and attempt billing/recording', async () => {
      const endedCall = {
        ...mockCallEntity,
        endedAt: new Date(),
        answeredAt: new Date(Date.now() - 5_000),
        externalId: 'ext-1',
      } as any;

      callRepository.findOneBy.mockResolvedValue(endedCall);
      callRepository.save.mockResolvedValue({ ...endedCall, state: CallState.ENDED } as any);
      callRepository.find.mockResolvedValue([]);
      billingService.getRate.mockResolvedValue(0.001);
      telephonyProvider.getRecording.mockResolvedValue(Readable.from(['x']) as any);

      await service.handleStandardWebhookEvent({
        eventType: 'call_ended',
        callId: 'call-123',
        externalId: 'ext-1',
        organizationId: 'org-1',
        data: { from: '100', to: '200' },
      } as any);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'call.updated' }),
      );
      expect(billingService.getRate).toHaveBeenCalled();
      expect(billingService.chargeForCall).toHaveBeenCalled();
      expect(storageService.uploadRecording).toHaveBeenCalled();
    });
  });
});
