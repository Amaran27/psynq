'use client';

import { useEffect } from 'react';
import { useCallStore } from '../stores/call.store';
import { useAuthStore } from '../stores/auth.store';
import { useAdapterStore } from '../stores/adapter.store';
import { CallCenterView } from '../components/CallCenterView';
import { LoginScreen } from '../components/LoginScreen';
import { AgentStatus, Call, CallState } from '@psynq/core';

export function CallCenterContainer() {
  const {
    calls,
    currentCall,
    isLoading: callsLoading,
    error: callsError,
    activeCallsCount,
    initializeTelephony,
    loadActiveCalls,
    createCall,
    answerCall,
    holdCall,
    resumeCall,
    endCall,
    selectCall,
    updateCall,
    addCall,
    tips,
  } = useCallStore();

  const {
    isLoggedIn,
    user,
    token,
    status: agentStatus,
    isLoading: authLoading,
    error: authError,
    login,
    logout,
    loadInitialAuth,
    updateAgentStatus,
    fetchAgentStatus,
    isAuthenticated,
  } = useAuthStore();

  const { initializeAdapter, apiAdapter } = useAdapterStore();

  // Initialize API adapter
  useEffect(() => {
    initializeAdapter();
  }, [initializeAdapter]);

  // Set API adapter in auth store
  useEffect(() => {
    if (apiAdapter) {
      useAuthStore.getState().setApiAdapter(apiAdapter);
    }
  }, [apiAdapter]);

  // Load initial authentication state
  useEffect(() => {
    loadInitialAuth();
  }, [loadInitialAuth]);

  // Once authenticated, initialize telephony
  useEffect(() => {
    if (isLoggedIn && token && user && apiAdapter) {
      (async () => {
        try {
          if (!isAuthenticated()) {
            logout();
            return;
          }
          
          await initializeTelephony(user.id, token);
          await loadActiveCalls(token);
          await fetchAgentStatus();
        } catch (err) {
          console.error('Initialization failed:', err);
        }
      })();

      const unsubscribeUpdates = apiAdapter.subscribeToCallUpdates((updatedCall: Call) => {
        updateCall(updatedCall);
      }, token);

      const unsubscribeNewCalls = apiAdapter.subscribeToNewCalls((newCall: Call) => {
        addCall(newCall);
      }, token);

      return () => {
        unsubscribeUpdates();
        unsubscribeNewCalls();
      };
    }
  }, [isLoggedIn, token, user, apiAdapter, initializeTelephony, loadActiveCalls, fetchAgentStatus, updateCall, addCall, isAuthenticated, logout]);

  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleAnswerCall = async (callId: string) => {
    if (!token || !user?.id) return;
    try {
      await answerCall(callId, user.id, token);
    } catch (err) {
      console.error('Failed to answer call:', err);
    }
  };

  const handleHoldCall = async (callId: string) => {
    if (!token) return;
    try {
      await holdCall(callId, token);
    } catch (err) {
      console.error('Failed to hold call:', err);
    }
  };

  const handleResumeCall = async (callId: string) => {
    if (!token) return;
    try {
      await resumeCall(callId, token);
    } catch (err) {
      console.error('Failed to resume call:', err);
    }
  };

  const handleEndCall = async (callId: string) => {
    if (!token) return;
    try {
      await endCall(callId, token);
    } catch (err) {
      console.error('Failed to end call:', err);
    }
  };

  const handleSelectCall = (callId: string | null) => {
    selectCall(callId ? calls.find(c => c.id === callId) || null : null);
  };

  const handleCreateCall = async (to: string) => {
    if (!token) return;
    try {
      const from = 'system'; // Or agent specific number
      await createCall(from, to, token);
    } catch (err) {
      console.error('Failed to create call:', err);
    }
  };

  const handleUpdateAgentStatus = async (newStatus: AgentStatus) => {
    if (!token) return;
    try {
      await updateAgentStatus(newStatus);
    } catch (err) {
      console.error('Failed to update agent status:', err);
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} isLoading={authLoading} error={authError} />;
  }

  return (
    <CallCenterView
      calls={calls}
      currentCall={currentCall}
      tips={tips}
      isLoading={callsLoading || authLoading}
      error={callsError || authError}
      stats={{
        activeCalls: activeCallsCount,
        ringingCalls: calls.filter(c => c.state === CallState.RINGING).length,
        answeredCalls: calls.filter(c => c.state === CallState.ANSWERED).length,
        onHoldCalls: calls.filter(c => c.state === CallState.ON_HOLD).length,
      }}
      agentStatus={agentStatus}
      onUpdateAgentStatus={handleUpdateAgentStatus}
      onLogout={logout}
      onCreateCall={handleCreateCall}
      onAnswerCall={handleAnswerCall}
      onHoldCall={handleHoldCall}
      onResumeCall={handleResumeCall}
      onEndCall={handleEndCall}
      onSelectCall={handleSelectCall}
    />
  );
}