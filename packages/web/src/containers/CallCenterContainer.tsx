'use client';

import { useEffect } from 'react';
import { useCallStore } from '../stores/call.store';
import { HttpCallApiAdapter } from '../adapters/http-call-api.adapter';
import { CallCenterView } from '../components/CallCenterView';
import { Call } from '@psynq/core';

export function CallCenterContainer() {
  const {
    calls,
    currentCall,
    isLoading,
    error,
    activeCallsCount,
    ringingCallsCount,
    answeredCallsCount,
    onHoldCallsCount,
    setApiAdapter,
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

  // Initialize API adapter on mount
  useEffect(() => {
    const adapter = new HttpCallApiAdapter();
    setApiAdapter(adapter);
  }, [setApiAdapter]);

  // Load active calls on mount
  useEffect(() => {
    loadActiveCalls();
  }, [loadActiveCalls]);

  // Subscribe to real-time call updates
  useEffect(() => {
    const adapter = new HttpCallApiAdapter();

    const unsubscribeUpdates = adapter.subscribeToCallUpdates((updatedCall: Call) => {
      updateCall(updatedCall);
    });

    const unsubscribeNewCalls = adapter.subscribeToNewCalls((newCall: Call) => {
      addCall(newCall);
    });

    return () => {
      unsubscribeUpdates();
      unsubscribeNewCalls();
    };
  }, [updateCall, addCall]);

  const handleAnswerCall = async (callId: string) => {
    try {
      // For demo purposes, use a fixed agent ID
      const agentId = '550e8400-e29b-41d4-a716-446655440000';
      await answerCall(callId, agentId);
      // Auto-select the answered call
      const answeredCall = calls.find(c => c.id === callId);
      if (answeredCall) {
        selectCall(answeredCall);
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  };

  const handleHoldCall = async (callId: string) => {
    try {
      await holdCall(callId);
    } catch (error) {
      console.error('Failed to hold call:', error);
    }
  };

  const handleResumeCall = async (callId: string) => {
    try {
      await resumeCall(callId);
    } catch (error) {
      console.error('Failed to resume call:', error);
    }
  };

  const handleEndCall = async (callId: string) => {
    try {
      await endCall(callId);
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const handleSelectCall = (callId: string | null) => {
    if (callId) {
      const call = calls.find(c => c.id === callId);
      selectCall(call || null);
    } else {
      selectCall(null);
    }
  };

  const handleCreateCall = async (to: string) => {
    try {
      const from = 'agent1'; // Fixed for demo
      await createCall(from, to);
    } catch (error) {
      console.error('Failed to create call:', error);
    }
  };

  return (
    <CallCenterView
      calls={calls}
      currentCall={currentCall}
      isLoading={isLoading}
      error={error}
      stats={{
        activeCalls: activeCallsCount,
        ringingCalls: ringingCallsCount,
        answeredCalls: answeredCallsCount,
        onHoldCalls: onHoldCallsCount,
      }}
      onCreateCall={handleCreateCall}
      onAnswerCall={handleAnswerCall}
      onHoldCall={handleHoldCall}
      onResumeCall={handleResumeCall}
      onEndCall={handleEndCall}
      onSelectCall={handleSelectCall}
    />
  );
}