import { create } from 'zustand';
import { Call, CallState, TelephonyConnection } from '@psynq/core';
import { TelephonyService } from '../services/telephony.service';
import { useAdapterStore } from './adapter.store';
import { useAuthStore } from './auth.store'; // Import auth store

interface CallStore {
  // State
  calls: Call[];
  currentCall: Call | null;
  isLoading: boolean;
  error: string | null;
  telephonyService: TelephonyService | null;
  incomingConnection: TelephonyConnection | null;
  pollingInterval: NodeJS.Timeout | null;

  // Actions
  initializeTelephony: (agentId: string, authToken: string) => Promise<void>;
  loadActiveCalls: (authToken: string) => Promise<void>;
  startPolling: (authToken: string) => void; // New action
  stopPolling: () => void; // New action
  createCall: (from: string, to: string, authToken: string) => Promise<void>;
  answerCall: (callId: string, agentId: string, authToken: string) => Promise<void>;
  holdCall: (callId: string, authToken: string) => Promise<void>;
  resumeCall: (callId: string, authToken: string) => Promise<void>;
  endCall: (callId: string, authToken: string) => Promise<void>;
  selectCall: (call: Call | null) => void;
  updateCall: (call: Call) => void;
  addCall: (call: Call) => void;

  // Computed properties
  activeCallsCount: number;
  ringingCallsCount: number;
  answeredCallsCount: number;
  onHoldCallsCount: number;
}

export const useCallStore = create<CallStore>((set, get) => ({
  // Initial state
  calls: [],
  currentCall: null,
  isLoading: false,
  error: null,
  telephonyService: null,
  incomingConnection: null,
  pollingInterval: null as NodeJS.Timeout | null, // State for polling

  // Initialize Telephony Service
  initializeTelephony: async (agentId: string, authToken: string) => {
    console.log('Initializing telephony service for agent:', agentId);
    console.log('Auth token provided:', authToken ? 'Yes' : 'No');
    
    const { apiAdapter } = useAdapterStore.getState(); // Get adapter from central store
    if (!apiAdapter) {
      set({ error: 'API adapter not initialized' });
      return;
    }
    
    if (!authToken) {
      set({ error: 'No authentication token provided for telephony initialization' });
      return;
    }
    
    if (get().telephonyService) {
      console.log('Telephony service already initialized');
      return;
    }

    const telephonyService = new TelephonyService(apiAdapter);

    // Register event handlers that interact with the store
    telephonyService.addEventListener('incoming', (e: Event) => {
      const connection = (e as CustomEvent<{ connection: TelephonyConnection }>).detail.connection;
      const callSid = connection.parameters.CallSid;
      console.log(`Incoming call ${callSid} received in store.`);
      const call = get().calls.find(c => c.id === callSid);
      if (call) {
        set({ incomingConnection: connection, currentCall: call });
      } else {
        set({ incomingConnection: connection });
      }
    });

    telephonyService.addEventListener('disconnect', (e: Event) => {
      const connection = (e as CustomEvent<{ connection: TelephonyConnection }>).detail.connection;
      const callSid = connection.parameters.CallSid;
      console.log(`Call ${callSid} disconnected.`);
      
      // 1. Optimistically update UI
      set(state => ({
        currentCall: state.currentCall?.id === callSid ? null : state.currentCall,
        incomingConnection: state.incomingConnection?.parameters.CallSid === callSid ? null : state.incomingConnection,
        calls: state.calls.map(c => c.id === callSid ? { ...c, state: CallState.ENDED, endedAt: new Date() } : c)
      }));

      // 2. Notify backend to ensure DB is consistent (Fix for missing webhooks in dev)
      const { apiAdapter } = useAdapterStore.getState();
      const { token } = useAuthStore.getState();
      
      if (apiAdapter && token) {
        console.log(`Notifying backend of disconnect for call ${callSid}`);
        apiAdapter.endCall(callSid, token).catch(err => {
          console.warn('Failed to notify backend of disconnect (call might already be ended):', err);
        });
      }
    });

    try {
      await telephonyService.initialize(agentId, authToken);
      set({ telephonyService });
      
      // Subscribe to real-time call updates using the token
      const unsubscribeUpdates = apiAdapter.subscribeToCallUpdates((updatedCall: Call) => {
        get().updateCall(updatedCall);
      }, authToken);

      const unsubscribeNewCalls = apiAdapter.subscribeToNewCalls((newCall: Call) => {
        get().addCall(newCall);
      }, authToken);

      // TODO: This return function will be called on unmount or re-initialization
      // This needs to be managed from a higher level, e.g., CallCenterContainer cleanup
    } catch (err) {
      console.error('Failed to initialize telephony service:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred during initialization';
      set({ error: errorMessage });
    }
  },

  // Load active calls
  loadActiveCalls: async (authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) {
      set({ error: 'API adapter not initialized' });
      return;
    }

    // Don't set global loading state for background refreshes if we already have calls
    if (get().calls.length === 0) {
      set({ isLoading: true, error: null });
    }
    
    try {
      const calls = await apiAdapter.getActiveCalls(authToken);
      
      // Merge with existing state to preserve local UI state if needed
      // For now, we just replace, but we check if currentCall is still valid
      const currentCallId = get().currentCall?.id;
      const stillActive = calls.find(c => c.id === currentCallId);
      
      set(state => ({ 
        calls, 
        isLoading: false,
        // If current call is no longer in the active list, clear it (unless it's just created locally)
        currentCall: currentCallId && !stillActive && state.currentCall?.state !== CallState.ENDED ? null : state.currentCall
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load calls',
        isLoading: false
      });
    }
  },

  startPolling: (authToken: string) => {
    const { pollingInterval } = get();
    if (pollingInterval) return; // Already polling

    console.log('Starting call status polling...');
    const interval = setInterval(() => {
      const { calls } = get();
      if (calls.length > 0) {
        get().loadActiveCalls(authToken);
      }
    }, 3000); // Poll every 3 seconds

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  // Create new call
  createCall: async (from: string, to: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter || !get().telephonyService) {
      throw new Error('Services not initialized');
    }
    const telephonyService = get().telephonyService as TelephonyService;

    set({ isLoading: true, error: null });
    try {
      // First, create the call on the backend
      const newCall = await apiAdapter.createCall(from, to, authToken);
      
      await telephonyService.connect({ To: to, From: from, CallSid: newCall.id });

      // The new call will be added to the store via the WebSocket 'newCall' event
      set({ isLoading: false, currentCall: newCall });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create call';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Answer call
  answerCall: async (callId: string, agentId: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) throw new Error('API adapter not initialized');
    
    const { incomingConnection, telephonyService } = get();

    if (!incomingConnection) {
      throw new Error('No active incoming connection to answer.');
    }
    
    // 1. Accept the audio connection
    telephonyService?.accept(incomingConnection);

    // 2. Notify the backend that we have answered
    set({ isLoading: true, error: null });
    try {
      const updatedCall = await apiAdapter.answerCall(callId, agentId, authToken);
      set(state => ({
        calls: state.calls.map(call =>
          call.id === callId ? updatedCall : call
        ),
        currentCall: updatedCall,
        incomingConnection: null, // Clear the incoming connection
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to answer call';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Hold call - This would be a backend-only operation unless you use client-side hold
  holdCall: async (callId: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) throw new Error('API adapter not initialized');

    set({ isLoading: true, error: null });
    try {
      const updatedCall = await apiAdapter.holdCall(callId, authToken);
      set(state => ({
        calls: state.calls.map(call =>
          call.id === callId ? updatedCall : call
        ),
        currentCall: state.currentCall?.id === callId ? updatedCall : state.currentCall,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to hold call';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Resume call
  resumeCall: async (callId: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) throw new Error('API adapter not initialized');

    set({ isLoading: true, error: null });
    try {
      const updatedCall = await apiAdapter.resumeCall(callId, authToken);
      set(state => ({
        calls: state.calls.map(call =>
          call.id === callId ? updatedCall : call
        ),
        currentCall: state.currentCall?.id === callId ? updatedCall : state.currentCall,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume call';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // End call
  endCall: async (callId: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) throw new Error('API adapter not initialized');
    
    // 1. Hang up the audio connection
    get().telephonyService?.hangup();

    // 2. Notify the backend
    set({ isLoading: true, error: null });
    try {
      await apiAdapter.endCall(callId, authToken);
      // The call state will be updated via the 'callUpdate' WebSocket event.
      set(state => ({
        calls: state.calls.filter(call => call.id !== callId),
        currentCall: state.currentCall?.id === callId ? null : state.currentCall,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end call';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Select current call
  selectCall: (call: Call | null) => {
    set({ currentCall: call });
  },

  // Update a call (for real-time updates)
  updateCall: (updatedCall: Call) => {
    set(state => ({
      calls: state.calls.map(call =>
        call.id === updatedCall.id ? updatedCall : call
      ),
      currentCall: state.currentCall?.id === updatedCall.id ? updatedCall : state.currentCall,
    }));
  },

  // Add a new call (for real-time new calls)
  addCall: (newCall: Call) => {
    // If this is a child leg, update the parent call instead of adding a new one
    const parentCallSid = (newCall as any).parentCallSid;
    if (parentCallSid) {
      const parentCall = get().calls.find(c => c.externalId === parentCallSid || c.id === parentCallSid);
      if (parentCall) {
        // Update the parent call with the child's state
        const updatedParent = { ...parentCall, state: newCall.state, answeredAt: newCall.answeredAt, endedAt: newCall.endedAt };
        set(state => ({
          calls: state.calls.map(c => c.id === parentCall.id ? updatedParent : c),
          currentCall: state.currentCall?.id === parentCall.id ? updatedParent : state.currentCall,
        }));
        return;
      }
    }
    // If there's a pending incoming connection, match it to the new call
    const { incomingConnection } = get();
    if (incomingConnection && incomingConnection.parameters.CallSid === newCall.id) {
      set({ currentCall: newCall });
    }
    set(state => ({
      // Avoid duplicates
      calls: state.calls.find(c => c.id === newCall.id) ? state.calls : [...state.calls, newCall],
    }));
  },

  // Computed properties
  get activeCallsCount() {
    return get().calls.length;
  },

  get ringingCallsCount() {
    return get().calls.filter(call => call.state === CallState.RINGING).length;
  },

  get answeredCallsCount() {
    return get().calls.filter(call => call.state === CallState.ANSWERED).length;
  },

  get onHoldCallsCount() {
    return get().calls.filter(call => call.state === CallState.ON_HOLD).length;
  },
}));