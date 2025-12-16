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

  test('injectSupervisor creates participant and returns participantSid', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    const participantCreateMock = jest.fn().mockResolvedValue({ sid: 'PARTICIPANT_SID' });
    const participantsFn: any = jest.fn().mockImplementation(() => ({ create: participantCreateMock }));
    const conferencesFn: any = jest.fn().mockImplementation((name: string) => ({ participants: participantsFn() }));

    (adapter as any).client = { conferences: conferencesFn } as any;

    const sid = await adapter.injectSupervisor('CALL123', 'supervisor1');

    expect(conferencesFn).toHaveBeenCalledWith('conf_CALL123');
    expect(participantCreateMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'client:supervisor1' }));
    expect(sid).toBe('PARTICIPANT_SID');
  });

  test('setParticipantMuted calls Twilio API to mute participant', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    const updateParticipantMock = jest.fn().mockResolvedValue({ sid: 'PARTICIPANT_SID', muted: true });
    const participantResource = jest.fn().mockImplementation((sid) => ({ update: updateParticipantMock }));
    const participantsList = jest.fn().mockReturnValue(participantResource);
    const conferencesResource = jest.fn().mockImplementation((name) => ({ participants: participantsList }));

    (adapter as any).client = { conferences: conferencesResource } as any;

    await adapter.setParticipantMuted('CALL123', 'PARTICIPANT_SID', true);

    expect(conferencesResource).toHaveBeenCalledWith('conf_CALL123');
    expect(participantsList).toHaveBeenCalled();
    expect(participantResource).toHaveBeenCalledWith('PARTICIPANT_SID');
    expect(updateParticipantMock).toHaveBeenCalledWith({ muted: true });
  });

  test('setParticipantMuted calls Twilio API to unmute participant', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    const updateParticipantMock = jest.fn().mockResolvedValue({ sid: 'PARTICIPANT_SID', muted: false });
    const participantResource = jest.fn().mockImplementation((sid) => ({ update: updateParticipantMock }));
    const participantsList = jest.fn().mockReturnValue(participantResource);
    const conferencesResource = jest.fn().mockImplementation((name) => ({ participants: participantsList }));

    (adapter as any).client = { conferences: conferencesResource } as any;

    await adapter.setParticipantMuted('CALL123', 'PARTICIPANT_SID', false);

    expect(conferencesResource).toHaveBeenCalledWith('conf_CALL123');
    expect(participantsList).toHaveBeenCalled();
    expect(participantResource).toHaveBeenCalledWith('PARTICIPANT_SID');
    expect(updateParticipantMock).toHaveBeenCalledWith({ muted: false });
  });

  test('setParticipantMuted no-op when client is not configured', async () => {
    const adapter = new TwilioAdapter(mockConfig() as any);
    (adapter as any).client = null;

    await expect(adapter.setParticipantMuted('ANY', 'PART', true)).resolves.not.toThrow();
  });
});
