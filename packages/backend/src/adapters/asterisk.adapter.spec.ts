import { AsteriskAdapter } from './asterisk.adapter';
import { Call, CallState } from '@psynq/core';

describe('AsteriskAdapter (basic)', () => {
  it('should accept callbacks and invoke on incoming call', () => {
    const adapter = new AsteriskAdapter();

    let receivedCall: Call | null = null;
    adapter.setCallReceivedCallback((c: Call) => {
      receivedCall = c;
    });

    // Simulate an incoming channel object as ARI would provide
    const fakeChannel: any = {
      id: 'CH123',
      caller: { number: '+14155550000' },
      dialplan: { exten: '1001' },
    };

    // Private method used in adapter, but we can call via any
    (adapter as any).handleIncomingCall(fakeChannel);

    expect(receivedCall).not.toBeNull();
    expect(receivedCall!.id).toBe('CH123');
    expect(receivedCall!.state).toBe(CallState.RINGING);
  });

  it('healthCheck should return boolean', async () => {
    const adapter = new AsteriskAdapter();
    // No actual ARI server during unit tests; healthCheck should catch and return boolean
    const ok = await (adapter as any).healthCheck?.();
    expect(typeof ok).toBe('boolean');
  });
});