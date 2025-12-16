'use client';

import { useEffect, useState } from 'react';
import { useCallStore } from '../stores/call.store';
import { useAuthStore } from '../stores/auth.store';
import { useAdapterStore } from '../stores/adapter.store';
import { CallCenterView } from '../components/CallCenterView';
import { LoginScreen } from '../components/LoginScreen';
import { AgentStatusSelector } from '../components/AgentStatusSelector';
import { AgentStatus, Call } from '@psynq/core';

export function CallCenterContainer() {
  const {
    calls,
    currentCall,
    isLoading: callsLoading,
    error: callsError,
    activeCallsCount,
    ringingCallsCount,
    answeredCallsCount,
    onHoldCallsCount,
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
  } = useAuthStore();

  const { initializeAdapter, apiAdapter } = useAdapterStore();

  // Initialize API adapter
  useEffect(() => {
    initializeAdapter();
  }, [initializeAdapter]);

  // Set API adapter in auth store as soon as it's available
  useEffect(() => {
    if (apiAdapter) {
      useAuthStore.getState().setApiAdapter(apiAdapter);
    }
  }, [apiAdapter]);

  // Load initial authentication state
  useEffect(() => {
    loadInitialAuth();
  }, [loadInitialAuth]);

  // Once authenticated, initialize telephony and subscriptions
  useEffect(() => {
    if (isLoggedIn && token && user && apiAdapter) {
      (async () => {
        try {
          initializeTelephony(user.id, token);
          await loadActiveCalls(token);
          // Start background polling so we pick up status changes even if webhooks arrive while offline
          useCallStore.getState().startPolling(token);
          await fetchAgentStatus();
        } catch (err) {
          console.error('Initialization failed:', err);
        }
      })();

      // Setup WebSocket subscriptions when authenticated
      const unsubscribeUpdates = apiAdapter.subscribeToCallUpdates((updatedCall: Call) => {
        updateCall(updatedCall);
      }, token);

      const unsubscribeNewCalls = apiAdapter.subscribeToNewCalls((newCall: Call) => {
        addCall(newCall);
      }, token);

      return () => {
        unsubscribeUpdates();
        unsubscribeNewCalls();
        useCallStore.getState().stopPolling();
      };
    }
  }, [isLoggedIn, token, user, apiAdapter, initializeTelephony, loadActiveCalls, fetchAgentStatus, updateCall, addCall]);

  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleAnswerCall = async (callId: string) => {
    if (!token || !user?.id) return;

    // Ensure there is an active incoming connection matching this call
    const { incomingConnection } = useCallStore.getState();
    const connectionCallSid = incomingConnection?.parameters?.CallSid;
    if (!incomingConnection || connectionCallSid !== callId) {
      console.warn('Attempted to answer call without an active incoming connection', { callId, connectionCallSid });
      // Optionally, attempt to refresh call state from backend instead of throwing
      try {
        await useCallStore.getState().loadActiveCalls(token);
      } catch (err) {
        console.error('Failed to refresh calls after missing connection:', err);
      }
      return;
    }

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
      const from = process.env.NEXT_PUBLIC_TWILIO_FROM_NUMBER || 'default_from_number';
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
      isLoading={callsLoading || authLoading}
      error={callsError || authError}
      stats={{
        activeCalls: activeCallsCount,
        ringingCalls: ringingCallsCount,
        answeredCalls: answeredCallsCount,
        onHoldCalls: onHoldCallsCount,
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