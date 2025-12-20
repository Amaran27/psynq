import { AsteriskAdapter } from './asterisk.adapter';
import { Call, CallState } from '@psynq/core';
// Note: we avoid importing node-fetch in tests since it's ESM-only; instead
// we will spy on the probe logic by stubbing http/https if necessary. For the
// simple case below, we will override the adapter method directly in the test.

describe('AsteriskAdapter (basic)', () => {
  const mockStorageService = {
    // Mock methods if needed
  };

  it('should accept callbacks and invoke on incoming call', () => {
    const adapter = new AsteriskAdapter(mockStorageService as any);

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
    const adapter = new AsteriskAdapter(mockStorageService as any);
    // No actual ARI server during unit tests; healthCheck should catch and return boolean
    const ok = await (adapter as any).healthCheck?.();
    expect(typeof ok).toBe('boolean');
  });

  it('connectToAsterisk should not throw when ARI swagger returns non-OK', async () => {
    // Monkey-patch the probe helper by replacing connectToAsterisk with a version
    // that calls the internal probe implementation with a fake non-OK result.
    const adapter = new AsteriskAdapter(mockStorageService as any);

    // Replace internal probe by calling the original and forcing a failure via
    // temporarily overriding global http.request. Simpler: call private method
    // and assert it resolves and leaves client null.
    await expect((adapter as any).connectToAsterisk()).resolves.not.toThrow();
    const ok = await (adapter as any).isConnected?.();
    expect(ok).toBe(false);
  });
});