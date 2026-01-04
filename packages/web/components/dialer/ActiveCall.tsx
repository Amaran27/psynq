'use client';

import React, { useEffect, useState } from 'react';
import { useCallStore } from '@/stores/call.store';
import { useAuthStore } from '@/stores/auth.store';
import { CallState } from '@psynq/core';

export const ActiveCall: React.FC = () => {
  const { currentCall, endCall, toggleMute, isMuted, holdCall, resumeCall } = useCallStore();
  const { token } = useAuthStore();
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentCall?.state === CallState.ANSWERED) {
      // Calculate initial duration if start time exists
      const startTime = currentCall.answeredAt ? new Date(currentCall.answeredAt).getTime() : Date.now();
      
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [currentCall?.state, currentCall?.answeredAt]);

  if (!currentCall || !token) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isOnHold = currentCall.state === CallState.ON_HOLD;

  return (
    <div className="flex flex-col w-full max-w-sm bg-white rounded-xl shadow-xl border border-blue-100 overflow-hidden">
      {/* Header / Status */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white text-center">
        <h3 className="text-xl font-bold mb-1">
          {currentCall.direction === 'inbound' ? currentCall.from : currentCall.to}
        </h3>
        <p className="text-blue-100 text-sm mb-2 uppercase tracking-wide font-semibold">
          {currentCall.state.replace('_', ' ')}
        </p>
        <div className="text-3xl font-mono font-light tracking-wider">
          {formatDuration(duration)}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 grid grid-cols-3 gap-6 bg-gray-50">
        {/* Mute Button */}
        <button
          onClick={() => toggleMute()}
          className={`flex flex-col items-center gap-2 transition-colors ${
            isMuted ? 'text-red-500' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className={`p-3 rounded-full ${isMuted ? 'bg-red-100' : 'bg-white shadow-sm border border-gray-200'}`}>
            {isMuted ? '🔇' : '🎙️'}
          </div>
          <span className="text-xs font-medium">Mute</span>
        </button>

        {/* Hold Button */}
        <button
          onClick={() => isOnHold ? resumeCall(currentCall.id, token) : holdCall(currentCall.id, token)}
          className={`flex flex-col items-center gap-2 transition-colors ${
            isOnHold ? 'text-orange-500' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className={`p-3 rounded-full ${isOnHold ? 'bg-orange-100' : 'bg-white shadow-sm border border-gray-200'}`}>
            ⏸️
          </div>
          <span className="text-xs font-medium">{isOnHold ? 'Resume' : 'Hold'}</span>
        </button>

        {/* Keypad Toggle (Placeholder) */}
        <button className="flex flex-col items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <div className="p-3 rounded-full bg-white shadow-sm border border-gray-200">
            🔢
          </div>
          <span className="text-xs font-medium">Keypad</span>
        </button>
      </div>

      {/* End Call Action */}
      <div className="p-6 pt-0 bg-gray-50 flex justify-center">
        <button
          onClick={() => endCall(currentCall.id, token)}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          📞 End Call
        </button>
      </div>
    </div>
  );
};
