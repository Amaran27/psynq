// Mock @psynq/core to avoid ESM import issues from built package during Jest
jest.mock('@psynq/core', () => {
  const CallState = {
    IDLE: 'idle',
    RINGING: 'ringing',
    ANSWERED: 'answered',
    ON_HOLD: 'on_hold',
    ENDED: 'ended',
  } as const;

  class Call {
    id: string;
    state: any;
    from: string;
    to: string;
    direction: string;
    externalId?: string;
    providerMetadata?: Record<string, any>;
    startedAt?: Date;
    answeredAt?: Date;
    endedAt?: Date;
    constructor(id: string, from: string, to: string, direction: string = 'inbound') {
      this.id = id;
      this.from = from;
      this.to = to;
      this.direction = direction;
      this.state = CallState.IDLE;
      this.startedAt = new Date();
    }
  }

  class CallStateTransitionError extends Error {}

  class CallStateMachine {
    canTransition(_call: any, _newState: any) { return true; }
    startCall(call: any) { call.state = CallState.RINGING; }
    answerCall(call: any) { call.state = CallState.ANSWERED; call.answeredAt = new Date(); }
    endCall(call: any) { call.state = CallState.ENDED; call.endedAt = new Date(); }
    holdCall(call: any) { call.state = CallState.ON_HOLD; }
    resumeCall(call: any) { call.state = CallState.ANSWERED; }
  }

  const CallDirection = { INBOUND: 'inbound', OUTBOUND: 'outbound' } as const;
  return { Call, CallState, CallStateMachine, CallStateTransitionError, CallDirection };
});

import { CallService } from './call.service';
import { CallEntity } from '../entities/call.entity';
import { CallState } from '@psynq/core';
import { CallParticipantService } from './call-participant.service';
import { CallParticipant } from '../interfaces/call-participant.interface';

const mockRepository = () => ({
  findOneBy: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

const mockGateway = () => ({
  emitNewCall: jest.fn(),
  emitCallUpdate: jest.fn(),
});

const mockTwilioAdapter = () => ({
  findQueueByName: jest.fn(),
  getFirstCallFromQueue: jest.fn(),
  redirectCall: jest.fn(),
  createCall: jest.fn(),
  endCall: jest.fn(),
  injectSupervisor: jest.fn(),
  setParticipantMuted: jest.fn(),
  getCapabilities: jest.fn().mockReturnValue({
    supportsSupervisorInjection: true,
    supportsParticipantMute: true,
    supportsParticipantHold: true,
    supportsBridgeCall: true,
    supportsTransfer: true
  })
});

const mockInfobip = () => ({ makeCall: jest.fn(), endCall: jest.fn(), getCapabilities: jest.fn().mockReturnValue({
  supportsSupervisorInjection: false,
  supportsParticipantMute: false,
  supportsParticipantHold: false,
  supportsBridgeCall: true
}) });

const mockConfig = () => ({ get: jest.fn().mockReturnValue('+15005550006') });

const mockCallParticipantService = () => ({
  addParticipant: jest.fn(),
  updateParticipant: jest.fn(),
  updateParticipantMuteState: jest.fn(),
  removeParticipant: jest.fn(),
  getParticipantByCallAndId: jest.fn(),
  getParticipantsByCallId: jest.fn(),
  getSupervisorsByCallId: jest.fn(),
});

describe('CallService.handleTwilioStatusCallback', () => {
  let service: CallService;
  let repository: ReturnType<typeof mockRepository>;
  let gateway: ReturnType<typeof mockGateway>;
  let callParticipantService: ReturnType<typeof mockCallParticipantService>;

  beforeEach(() => {
    repository = mockRepository();
    gateway = mockGateway();
    const twilioAdapter = mockTwilioAdapter();
    const infobipAdapter = mockInfobip();
    const configService = mockConfig() as any;
    callParticipantService = mockCallParticipantService();

    // @ts-ignore - inject mocks
    service = new CallService(repository as any, gateway as any, twilioAdapter as any, infobipAdapter as any, configService, callParticipantService);
  });

  test('creates inbound call on ringing when none exists', async () => {
    repository.findOneBy.mockResolvedValueOnce(undefined); // by twilioSid
    repository.findOneBy.mockResolvedValueOnce(undefined); // by id

    await service.handleTwilioStatusCallback({ CallSid: 'SID1', CallStatus: 'ringing', From: '+911234567890', To: '+15005550006', Direction: 'inbound' });

    expect(repository.save).toHaveBeenCalled();
    const savedArg = repository.save.mock.calls[0][0] as CallEntity;
    expect(savedArg.id).toBe('SID1');
    expect(savedArg.state).toBe(CallState.RINGING);
  });

  test('transitions from ringing to answered on in-progress', async () => {
    const existing: any = { id: 'SID2', state: CallState.RINGING, from: '+9112345', to: '+15005550006' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await service.handleTwilioStatusCallback({ CallSid: 'SID2', CallStatus: 'in-progress' });

    expect(repository.save).toHaveBeenCalled();
    const savedArg = repository.save.mock.calls[0][0] as CallEntity;
    expect(savedArg.state).toBe(CallState.ANSWERED);
    expect(savedArg.answeredAt).toBeDefined();
  });

  test('transitions to ended on completed', async () => {
    const existing: any = { id: 'SID3', state: CallState.ANSWERED, from: '+9112345', to: '+15005550006' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await service.handleTwilioStatusCallback({ CallSid: 'SID3', CallStatus: 'completed' });

    expect(repository.save).toHaveBeenCalled();
    const savedArg = repository.save.mock.calls[0][0] as CallEntity;
    expect(savedArg.state).toBe(CallState.ENDED);
    expect(savedArg.endedAt).toBeDefined();
  });

  test('is idempotent for repeated completed', async () => {
    const existing: any = { id: 'SID4', state: CallState.ENDED, from: '+9112345', to: '+15005550006' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.handleTwilioStatusCallback({ CallSid: 'SID4', CallStatus: 'completed' })).resolves.not.toThrow();
    // Should not attempt an invalid transition; save may still be called but state remains ENDED
    const savedArg = repository.save.mock.calls[0] ? repository.save.mock.calls[0][0] : null;
    if (savedArg) {
      expect(savedArg.state).toBe(CallState.ENDED);
    }
  });

  test('injectSupervisor calls TwilioAdapter and persists participant', async () => {
    const existing: any = { id: 'CALL5', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', externalId: 'TW5' };
    repository.findOneBy.mockResolvedValueOnce(existing);
    
    const mockParticipant: CallParticipant = {
      id: 'participant_123',
      callId: 'CALL5',
      participantId: 'supervisor1',
      participantType: 'supervisor',
      providerCallSid: 'PART_SID',
      isMuted: false,
      isOnHold: false,
      joinedAt: new Date(),
      providerSpecificData: { conferenceName: 'conf_TW5', twilioParticipantSid: 'PART_SID' }
    };
    
    const twilioAdapter = (service as any).twilioAdapter as any;
    twilioAdapter.getCapabilities = jest.fn().mockReturnValue({
      supportsSupervisorInjection: true,
      supportsParticipantMute: true,
      supportsParticipantHold: true,
      supportsBridgeCall: true,
      supportsTransfer: true
    });
    twilioAdapter.injectSupervisor = jest.fn().mockResolvedValue(mockParticipant);
    
    callParticipantService.addParticipant = jest.fn().mockResolvedValue(mockParticipant);

    const result = await service.injectSupervisor('CALL5', 'supervisor1');

    expect(twilioAdapter.getCapabilities).toHaveBeenCalled();
    expect(twilioAdapter.injectSupervisor).toHaveBeenCalledWith('TW5', 'supervisor1', undefined);
    expect(callParticipantService.addParticipant).toHaveBeenCalledWith({
      callId: 'CALL5',
      participantId: 'supervisor1',
      participantType: 'supervisor',
      providerCallSid: 'PART_SID',
      isMuted: false,
      isOnHold: false,
      providerSpecificData: { conferenceName: 'conf_TW5', twilioParticipantSid: 'PART_SID' }
    });
    expect(result).toEqual(mockParticipant);
  });

  test('injectSupervisor rejects for Infobip provider', async () => {
    const existing: any = { id: 'CALL6', state: CallState.ANSWERED, from: '+15005550006', to: '+911234567890' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.injectSupervisor('CALL6', 'sup')).rejects.toThrow('Supervisor injection is not supported for Infobip at this time');
  });

  test('supervisorUnmute calls TwilioAdapter to unmute participant', async () => {
    const existing: any = { id: 'CALL7', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', externalId: 'TW7' };
    repository.findOneBy.mockResolvedValueOnce(existing);
    
    const mockSupervisor: CallParticipant = {
      id: 'participant_123',
      callId: 'CALL7',
      participantId: 'supervisor1',
      participantType: 'supervisor',
      providerCallSid: 'PART7',
      isMuted: true,
      isOnHold: false,
      joinedAt: new Date(),
      providerSpecificData: { conferenceName: 'conf_TW7', twilioParticipantSid: 'PART7' }
    };
    
    callParticipantService.getSupervisorsByCallId = jest.fn().mockResolvedValue([mockSupervisor]);
    
    const twilioAdapter = (service as any).twilioAdapter as any;
    twilioAdapter.setParticipantMuted = jest.fn().mockResolvedValue(undefined);
    
    callParticipantService.updateParticipantMuteState = jest.fn().mockResolvedValue({ ...mockSupervisor, isMuted: false });

    await service.supervisorUnmute('CALL7');

    expect(callParticipantService.getSupervisorsByCallId).toHaveBeenCalledWith('CALL7');
    expect(twilioAdapter.setParticipantMuted).toHaveBeenCalledWith('conf_TW7:PART7', false);
    expect(callParticipantService.updateParticipantMuteState).toHaveBeenCalledWith('participant_123', false);
  });

  test('supervisorMute calls TwilioAdapter to mute participant', async () => {
    const existing: any = { id: 'CALL8', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', externalId: 'TW8' };
    repository.findOneBy.mockResolvedValueOnce(existing);
    
    const mockSupervisor: CallParticipant = {
      id: 'participant_456',
      callId: 'CALL8',
      participantId: 'supervisor2',
      participantType: 'supervisor',
      providerCallSid: 'PART8',
      isMuted: false,
      isOnHold: false,
      joinedAt: new Date(),
      providerSpecificData: { conferenceName: 'conf_TW8', twilioParticipantSid: 'PART8' }
    };
    
    callParticipantService.getSupervisorsByCallId = jest.fn().mockResolvedValue([mockSupervisor]);
    
    const twilioAdapter = (service as any).twilioAdapter as any;
    twilioAdapter.setParticipantMuted = jest.fn().mockResolvedValue(undefined);
    
    callParticipantService.updateParticipantMuteState = jest.fn().mockResolvedValue({ ...mockSupervisor, isMuted: true });

    await service.supervisorMute('CALL8');

    expect(callParticipantService.getSupervisorsByCallId).toHaveBeenCalledWith('CALL8');
    expect(twilioAdapter.setParticipantMuted).toHaveBeenCalledWith('conf_TW8:PART8', true);
    expect(callParticipantService.updateParticipantMuteState).toHaveBeenCalledWith('participant_456', true);
  });

  test('supervisorUnmute throws if no supervisor is injected', async () => {
    const existing: any = { id: 'CALL9', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', externalId: 'TW9' };
    repository.findOneBy.mockResolvedValueOnce(existing);
    
    callParticipantService.getSupervisorsByCallId = jest.fn().mockResolvedValue([]);

    await expect(service.supervisorUnmute('CALL9')).rejects.toThrow('No supervisor is injected for this call');
  });

  test('supervisorMute throws if no supervisor is injected', async () => {
    const existing: any = { id: 'CALL10', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', externalId: 'TW10' };
    repository.findOneBy.mockResolvedValueOnce(existing);
    
    callParticipantService.getSupervisorsByCallId = jest.fn().mockResolvedValue([]);

    await expect(service.supervisorMute('CALL10')).rejects.toThrow('No supervisor is injected for this call');
  });

  test('supervisorUnmute rejects for Infobip provider', async () => {
    const existing: any = { id: 'CALL11', state: CallState.ANSWERED, from: '+15005550006', to: '+911234567890' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.supervisorUnmute('CALL11')).rejects.toThrow('Supervisor injection is not supported for Infobip at this time');
  });

  test('supervisorMute rejects for Infobip provider', async () => {
    const existing: any = { id: 'CALL12', state: CallState.ANSWERED, from: '+15005550006', to: '+911234567890' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.supervisorMute('CALL12')).rejects.toThrow('Supervisor injection is not supported for Infobip at this time');
  });
});
