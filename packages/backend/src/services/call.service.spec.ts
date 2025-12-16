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
    twilioSid?: string;
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
});

const mockInfobip = () => ({ makeCall: jest.fn(), endCall: jest.fn() });

const mockConfig = () => ({ get: jest.fn().mockReturnValue('+15005550006') });

describe('CallService.handleTwilioStatusCallback', () => {
  let service: CallService;
  let repository: ReturnType<typeof mockRepository>;
  let gateway: ReturnType<typeof mockGateway>;

  beforeEach(() => {
    repository = mockRepository();
    gateway = mockGateway();
    const twilioAdapter = mockTwilioAdapter();
    const infobipAdapter = mockInfobip();
    const configService = mockConfig() as any;

    // @ts-ignore - inject mocks
    service = new CallService(repository as any, gateway as any, twilioAdapter as any, infobipAdapter as any, configService);
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

  test('injectSupervisor calls TwilioAdapter and persists participantSid', async () => {
    const existing: any = { id: 'CALL5', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', twilioSid: 'TW5' };
    repository.findOneBy.mockResolvedValueOnce(existing);
    const twilioAdapter = (service as any).twilioAdapter as any;
    twilioAdapter.injectSupervisor = jest.fn().mockResolvedValue('PART_SID');

    const result = await service.injectSupervisor('CALL5', 'supervisor1');

    expect(twilioAdapter.injectSupervisor).toHaveBeenCalledWith('TW5', 'supervisor1');
    expect(repository.save).toHaveBeenCalled();
    expect(result.supervisorParticipantSid).toBe('PART_SID');
  });

  test('injectSupervisor rejects for Infobip provider', async () => {
    const existing: any = { id: 'CALL6', state: CallState.ANSWERED, from: '+15005550006', to: '+911234567890' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.injectSupervisor('CALL6', 'sup')).rejects.toThrow();
  });

  test('supervisorUnmute calls TwilioAdapter to unmute participant', async () => {
    const existing: any = { id: 'CALL7', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', twilioSid: 'TW7', supervisorParticipantSid: 'PART7' };
    repository.findOneBy.mockResolvedValueOnce(existing);
    const twilioAdapter = (service as any).twilioAdapter as any;
    twilioAdapter.setParticipantMuted = jest.fn().mockResolvedValue(undefined);

    await service.supervisorUnmute('CALL7');

    expect(twilioAdapter.setParticipantMuted).toHaveBeenCalledWith('TW7', 'PART7', false);
  });

  test('supervisorMute calls TwilioAdapter to mute participant', async () => {
    const existing: any = { id: 'CALL8', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', twilioSid: 'TW8', supervisorParticipantSid: 'PART8' };
    repository.findOneBy.mockResolvedValueOnce(existing);
    const twilioAdapter = (service as any).twilioAdapter as any;
    twilioAdapter.setParticipantMuted = jest.fn().mockResolvedValue(undefined);

    await service.supervisorMute('CALL8');

    expect(twilioAdapter.setParticipantMuted).toHaveBeenCalledWith('TW8', 'PART8', true);
  });

  test('supervisorUnmute throws if no supervisor is injected', async () => {
    const existing: any = { id: 'CALL9', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', twilioSid: 'TW9' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.supervisorUnmute('CALL9')).rejects.toThrow('No supervisor is injected for this call');
  });

  test('supervisorMute throws if no supervisor is injected', async () => {
    const existing: any = { id: 'CALL10', state: CallState.ANSWERED, from: '+15005550006', to: '+12345', twilioSid: 'TW10' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.supervisorMute('CALL10')).rejects.toThrow('No supervisor is injected for this call');
  });

  test('supervisorUnmute rejects for Infobip provider', async () => {
    const existing: any = { id: 'CALL11', state: CallState.ANSWERED, from: '+15005550006', to: '+911234567890', supervisorParticipantSid: 'PART11' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.supervisorUnmute('CALL11')).rejects.toThrow('Supervisor mute/unmute not supported for Infobip at this time');
  });

  test('supervisorMute rejects for Infobip provider', async () => {
    const existing: any = { id: 'CALL12', state: CallState.ANSWERED, from: '+15005550006', to: '+911234567890', supervisorParticipantSid: 'PART12' };
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.supervisorMute('CALL12')).rejects.toThrow('Supervisor mute/unmute not supported for Infobip at this time');
  });
});
