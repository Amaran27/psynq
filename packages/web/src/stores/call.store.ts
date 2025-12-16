import { create } from 'zustand';
import { Call, CallState } from '@psynq/core';
import { CallApiPort } from '../ports/call-api.port';

interface CallStore {
  // State
  calls: Call[];
  currentCall: Call | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setApiAdapter: (adapter: CallApiPort) => void;
  loadActiveCalls: () => Promise<void>;
  createCall: (from: string, to: string) => Promise<Call>;
  answerCall: (callId: string, agentId: string) => Promise<void>;
  holdCall: (callId: string) => Promise<void>;
  resumeCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
  selectCall: (call: Call | null) => void;
  updateCall: (call: Call) => void;
  addCall: (call: Call) => void;

  // Computed properties
  activeCallsCount: number;
  ringingCallsCount: number;
  answeredCallsCount: number;
  onHoldCallsCount: number;
}

let apiAdapter: CallApiPort | null = null;

export const useCallStore = create<CallStore>((set, get) => ({
  // Initial state
  calls: [],
  currentCall: null,
  isLoading: false,
  error: null,

  // Set API adapter
  setApiAdapter: (adapter: CallApiPort) => {
    apiAdapter = adapter;
  },

  // Load active calls
  loadActiveCalls: async () => {
    if (!apiAdapter) {
      set({ error: 'API adapter not initialized' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const calls = await apiAdapter.getActiveCalls();
      set({ calls, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load calls',
        isLoading: false
      });
    }
  },

  // Create new call
  createCall: async (from: string, to: string) => {
    if (!apiAdapter) {
      throw new Error('API adapter not initialized');
    }

    set({ isLoading: true, error: null });
    try {
      const newCall = await apiAdapter.createCall(from, to);
      // Don't add here, let WebSocket handle it to avoid duplicates
      set({ isLoading: false });
      return newCall;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create call';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Answer call
  answerCall: async (callId: string, agentId: string) => {
    if (!apiAdapter) {
      throw new Error('API adapter not initialized');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedCall = await apiAdapter.answerCall(callId, agentId);
      set(state => ({
        calls: state.calls.map(call =>
          call.id === callId ? updatedCall : call
        ),
        currentCall: state.currentCall?.id === callId ? updatedCall : state.currentCall,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to answer call';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Hold call
  holdCall: async (callId: string) => {
    if (!apiAdapter) {
      throw new Error('API adapter not initialized');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedCall = await apiAdapter.holdCall(callId);
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
  resumeCall: async (callId: string) => {
    if (!apiAdapter) {
      throw new Error('API adapter not initialized');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedCall = await apiAdapter.resumeCall(callId);
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
  endCall: async (callId: string) => {
    if (!apiAdapter) {
      throw new Error('API adapter not initialized');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedCall = await apiAdapter.endCall(callId);
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
    set(state => ({
      calls: [...state.calls, newCall],
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