import { create } from 'zustand';
import { Call, CallState } from '@psynq/core';
import { TelephonyService } from '../services/telephony.service';
import { Connection } from '@twilio/voice-sdk';
import { useAdapterStore } from './adapter.store'; // Import the adapter store

interface CallStore {
  // State
  calls: Call[];
  currentCall: Call | null;
  isLoading: boolean;
  error: string | null;
  telephonyService: TelephonyService | null;
  incomingConnection: Connection | null;

  // Actions
  initializeTelephony: (agentId: string, authToken: string) => Promise<void>;
  loadActiveCalls: (authToken: string) => Promise<void>;
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

  // Initialize Telephony Service
  initializeTelephony: async (agentId: string, authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState(); // Get adapter from central store
    if (!apiAdapter) {
      set({ error: 'API adapter not initialized' });
      return;
    }
    if (get().telephonyService) return; // Only initialize once

    const telephonyService = new TelephonyService(apiAdapter);

    // Register event handlers that interact with the store
    telephonyService.addEventListener('incoming', (e: Event) => {
      const connection = (e as CustomEvent<{ connection: Connection }>).detail.connection;
      const callSid = connection.parameters.CallSid;
      console.log(`Incoming call ${callSid} received in store.`);
      const call = get().calls.find(c => c.id === callSid);
      if (call) {
        set({ incomingConnection: connection, currentCall: call });
      } else {
        set({ incomingConnection: connection });
      }
    });

    telephonyService.addEventListener('disconnect', () => {
      set({ currentCall: null, incomingConnection: null });
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
      set({ error: (err as Error).message });
    }
  },

  // Load active calls
  loadActiveCalls: async (authToken: string) => {
    const { apiAdapter } = useAdapterStore.getState();
    if (!apiAdapter) {
      set({ error: 'API adapter not initialized' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const calls = await apiAdapter.getActiveCalls(authToken);
      set({ calls, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load calls',
        isLoading: false
      });
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