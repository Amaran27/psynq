import { create } from 'zustand';
import { Call, CallState } from '@psynq/core';
import { useAdapterStore } from './adapter.store';
import { useAuthStore } from './auth.store';

interface CallStore {
  // State
  calls: Call[];
  currentCall: Call | null;
  isLoading: boolean;
  error: string | null;
  isAudioReady: boolean;
  isMuted: boolean;
  tips: { id: string; callId: string; text: string; timestamp: Date }[];

  // Actions
  initializeTelephony: (agentId: string, authToken: string) => Promise<void>;
  loadActiveCalls: (authToken: string) => Promise<void>;
  createCall: (from: string, to: string, authToken: string) => Promise<void>;
  answerCall: (callId: string, agentId: string, authToken: string) => Promise<void>;
  holdCall: (callId: string, authToken: string) => Promise<void>;
  resumeCall: (callId: string, authToken: string) => Promise<void>;
  endCall: (callId: string, authToken: string) => Promise<void>;
  toggleMute: () => Promise<void>;
  selectCall: (call: Call | null) => void;
  updateCall: (call: Call) => void;
  addCall: (call: Call) => void;

  // Computed properties
  activeCallsCount: number;
}

export const useCallStore = create<CallStore>((set, get) => ({
  // Initial state
  calls: [],
  currentCall: null,
  isLoading: false,
  error: null,
  isAudioReady: false,
  isMuted: false,
  tips: [],

  // Initialize Telephony via AudioPort (backend WebSocket only, SIP.js deferred)
  initializeTelephony: async (agentId: string, authToken: string) => {
    const { apiAdapter, audioAdapter } = useAdapterStore.getState();
    if (!apiAdapter || !audioAdapter) {
      set({ error: 'Adapters not initialized' });
      return;
    }

    try {
      // 1. Get dynamic SIP/WebRTC credentials from backend
      const telephonyConfig = await apiAdapter.getTelephonyToken(agentId, authToken);
      
      // 2. Store config in audio adapter but defer SIP.js initialization
      // SIP.js will be initialized on-demand when an inbound call is received
      await audioAdapter.initialize(telephonyConfig);

      // Set up audio adapter status callback for when SIP.js is initialized
      audioAdapter.onStatusChange((status) => {
        set({ isAudioReady: status.isReady, isMuted: status.isMuted });
      });
      
      // For outbound calls, we don't need SIP.js - backend ARI handles everything
      // So we can consider audio "ready" for outbound dialpad immediately
      set({ isAudioReady: true });

      audioAdapter.onIncomingCall((callId, from) => {
        console.log(`Incoming call from ${from}`);
      });

      // 3. Subscribe to real-time updates
      apiAdapter.subscribeToCallUpdates((updatedCall: Call) => {
        get().updateCall(updatedCall);
      }, authToken);

      apiAdapter.subscribeToNewCalls((newCall: Call) => {
        get().addCall(newCall);
      }, authToken);

      // 4. Subscribe to AI Coaching events
      apiAdapter.subscribeToIntelligenceEvents((event: any) => {
        if (event.type === 'intelligence.coaching_tip') {
          set(state => ({
            tips: [{
              id: Math.random().toString(36).substr(2, 9),
              callId: event.payload.callId,
              text: event.payload.tip,
              timestamp: new Date()
            }, ...state.tips].slice(0, 10) // Keep last 10 tips
          }));
        }
      }, authToken);

      console.log('%c[CallStore] ✅ Telephony initialized (backend WebSocket only, SIP.js deferred)', 'color: #4CAF50; font-weight: bold');
      set({ error: null });
    } catch (err) {
      console.error('Failed to initialize telephony:', err);
      const message = err instanceof Error ? err.message : String(err);
      set({ error: `Telephony initialization failed: ${message}` });
    }
  },

  loadActiveCalls: async (authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) return;

    set({ isLoading: true });
    try {
      const fetchedCalls = await apiAdapter.getActiveCalls(authToken);
      // Defensive: the backend (or transport) can occasionally produce duplicates.
      // Dedupe here to avoid React key warnings and inconsistent UI state.
      const calls = Array.isArray(fetchedCalls) ? fetchedCalls : [];
      const seenIds = new Set<string>();
      const dedupedCalls = calls.filter((c) => {
        const id = (c as any)?.id as string | undefined;
        if (!id) return true; // keep id-less calls; UI uses an index-based key fallback
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });
      set({ 
        calls: dedupedCalls,
        isLoading: false 
      });
    } catch (error) {
      set({ error: 'Failed to load calls', isLoading: false, calls: [] });
    }
  },

  createCall: async (from: string, to: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) return;

    set({ isLoading: true });
    try {
      const { user } = useAuthStore.getState();
      const agentId = user?.id || 'sysadmin';
      const newCall = await apiAdapter.createCall(from, to, authToken, agentId);
      // NOTE: Do NOT call audioAdapter.connect() for outbound calls
      // Backend handles call origination via ARI, browser will receive call as incoming
      set({ currentCall: newCall, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to create call', isLoading: false });
    }
  },

  answerCall: async (callId: string, agentId: string, authToken: string) => {
    const { apiAdapter, audioAdapter } = useAdapterStore.getState();
    if (!apiAdapter || !audioAdapter) return;

    try {
      await audioAdapter.connect(callId); // Accept audio
      const updatedCall = await apiAdapter.answerCall(callId, agentId, authToken);
      get().updateCall(updatedCall);
    } catch (error) {
      set({ error: 'Failed to answer call' });
    }
  },

  holdCall: async (callId: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) return;
    try {
      const updatedCall = await apiAdapter.holdCall(callId, authToken);
      get().updateCall(updatedCall);
    } catch (err) { set({ error: 'Hold failed' }); }
  },

  resumeCall: async (callId: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) return;
    try {
      const updatedCall = await apiAdapter.resumeCall(callId, authToken);
      get().updateCall(updatedCall);
    } catch (err) { set({ error: 'Resume failed' }); }
  },

  endCall: async (callId: string, authToken: string) => {
    const { apiAdapter, audioAdapter } = useAdapterStore.getState();
    if (!apiAdapter || !audioAdapter) return;

    try {
      await audioAdapter.disconnect();
      await apiAdapter.endCall(callId, authToken);
      set(state => ({
        calls: (state.calls || []).filter(c => c.id !== callId),
        currentCall: state.currentCall?.id === callId ? null : state.currentCall
      }));
    } catch (err) { set({ error: 'End call failed' }); }
  },

  toggleMute: async () => {
    const { audioAdapter } = useAdapterStore.getState();
    if (!audioAdapter) return;
    const newMuteState = !get().isMuted;
    await audioAdapter.setMuted(newMuteState);
    set({ isMuted: newMuteState });
  },

  selectCall: (call: Call | null) => set({ currentCall: call }),

  updateCall: (updatedCall: Call) => {
    set(state => {
      const safeCalls = Array.isArray(state.calls) ? state.calls : [];
      return {
        calls: safeCalls.map(c => c.id === updatedCall.id ? updatedCall : c),
        currentCall: state.currentCall?.id === updatedCall.id ? updatedCall : state.currentCall,
      };
    });
  },

  addCall: (newCall: Call) => {
    set(state => {
      const safeCalls = Array.isArray(state.calls) ? state.calls : [];
      return {
        calls: safeCalls.find(c => c.id === newCall.id) ? safeCalls : [...safeCalls, newCall]
      };
    });
  },

  get activeCallsCount() {
    return Array.isArray(get().calls) ? get().calls.length : 0;
  }
}));
