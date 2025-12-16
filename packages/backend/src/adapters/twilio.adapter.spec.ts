import { TwilioAdapter } from './twilio.adapter';

const mockClient = () => ({
  calls: {
    create: jest.fn(),
    update: jest.fn(),
  }
});

const mockConfig = () => ({ get: jest.fn().mockReturnValue('+15005550006') });

describe('TwilioAdapter.bridgeCall', () => {
  test('redirects call into conference and calls agent client', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    // inject mock client - calls is callable (for calls(callSid).update) and also has a create method
    const updateMock = jest.fn().mockResolvedValue({ sid: 'UPDATED' });
    const createMock = jest.fn().mockResolvedValue({ sid: 'AGENT_CALL_SID' });
    const callsFn: any = jest.fn().mockImplementation((sid: string) => ({ update: updateMock }));
    callsFn.create = createMock;
    (adapter as any).client = { calls: callsFn } as any;

    await adapter.bridgeCall('TW_CALL_SID', 'agent123');

    // The Twilio SDK is called as client.calls(callSid).update(...)
    expect((adapter as any).client.calls).toHaveBeenCalledWith('TW_CALL_SID');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ twiml: expect.any(String) }));
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'client:agent123' }));
  });

  test('calls phone number if agentId is phone', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    const updateMock = jest.fn().mockResolvedValue({ sid: 'UPDATED' });
    const createMock = jest.fn().mockResolvedValue({ sid: 'AGENT_CALL_SID' });
    const callsFn: any = jest.fn().mockImplementation((sid: string) => ({ update: updateMock }));
    callsFn.create = createMock;
    (adapter as any).client = { calls: callsFn } as any;

    await adapter.bridgeCall('TW_CALL_SID', '+911234567890');

    expect((adapter as any).client.calls).toHaveBeenCalledWith('TW_CALL_SID');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ twiml: expect.any(String) }));
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+911234567890' }));
  });

  test('no-op when client is not configured', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    (adapter as any).client = null;

    await expect(adapter.bridgeCall('ANY', 'agent')).resolves.not.toThrow();
    await expect(adapter.injectSupervisor('ANY', 'supervisor')).resolves.toBeUndefined();
  });

  test('injectSupervisor creates participant and returns CallParticipant', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    const participantCreateMock = jest.fn().mockResolvedValue({ sid: 'PARTICIPANT_SID' });
    const participantsFn: any = jest.fn().mockImplementation(() => ({ create: participantCreateMock }));
    const conferencesFn: any = jest.fn().mockImplementation((name: string) => ({ participants: participantsFn() }));

    (adapter as any).client = { conferences: conferencesFn } as any;

    const participant = await adapter.injectSupervisor('CALL123', 'supervisor1');

    expect(conferencesFn).toHaveBeenCalledWith('conf_CALL123');
    expect(participantCreateMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'client:supervisor1' }));
    expect(participant).toEqual({
      id: expect.stringMatching(/^participant_\d+_[a-z0-9]+$/),
      callId: 'CALL123',
      participantId: 'supervisor1',
      participantType: 'supervisor',
      providerCallSid: 'PARTICIPANT_SID',
      isMuted: true, // Supervisors are muted by default in Twilio
      isOnHold: false,
      joinedAt: expect.any(Date),
      providerSpecificData: {
        conferenceName: 'conf_CALL123',
        twilioParticipantSid: 'PARTICIPANT_SID'
      }
    });
  });

  test('setParticipantMuted calls Twilio API to mute participant', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    const updateParticipantMock = jest.fn().mockResolvedValue({ sid: 'PARTICIPANT_SID', muted: true });
    const participantsResource = jest.fn().mockImplementation((sid) => ({ update: updateParticipantMock }));
    const conferencesResource = jest.fn().mockImplementation((name) => ({ participants: participantsResource }));

    (adapter as any).client = { conferences: conferencesResource } as any;

    await adapter.setParticipantMuted('conf_CALL123:PARTICIPANT_SID', true);

    expect(conferencesResource).toHaveBeenCalledWith('conf_CALL123');
    expect(participantsResource).toHaveBeenCalledWith('PARTICIPANT_SID');
    expect(updateParticipantMock).toHaveBeenCalledWith({ muted: true });
  });

  test('setParticipantMuted calls Twilio API to unmute participant', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    const updateParticipantMock = jest.fn().mockResolvedValue({ sid: 'PARTICIPANT_SID', muted: false });
    const participantsResource = jest.fn().mockImplementation((sid) => ({ update: updateParticipantMock }));
    const conferencesResource = jest.fn().mockImplementation((name) => ({ participants: participantsResource }));

    (adapter as any).client = { conferences: conferencesResource } as any;

    await adapter.setParticipantMuted('conf_CALL123:PARTICIPANT_SID', false);

    expect(conferencesResource).toHaveBeenCalledWith('conf_CALL123');
    expect(participantsResource).toHaveBeenCalledWith('PARTICIPANT_SID');
    expect(updateParticipantMock).toHaveBeenCalledWith({ muted: false });
  });

  test('setParticipantMuted no-op when client is not configured', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    (adapter as any).client = null;

    await expect(adapter.setParticipantMuted('conf_ANY:PART', true)).resolves.not.toThrow();
  });
});
