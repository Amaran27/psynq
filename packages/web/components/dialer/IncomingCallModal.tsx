'use client';

import React from 'react';
import { useCallStore } from '@/stores/call.store';
import { useAuthStore } from '@/stores/auth.store';
import { CallState } from '@psynq/core';

export const IncomingCallModal: React.FC = () => {
  const { calls, answerCall, endCall } = useCallStore();
  const { user, token } = useAuthStore();
  
  // Find the first incoming ringing call
  const incomingCall = calls.find(c => 
    c.direction === 'inbound' && 
    c.state === CallState.RINGING
  );

  if (!incomingCall || !user || !token) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Caller Info */}
        <div className="bg-gray-900 p-8 text-center text-white">
          <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-inner">
            👤
          </div>
          <h2 className="text-2xl font-bold mb-1">{incomingCall.from}</h2>
          <p className="text-gray-400 animate-pulse">Incoming Call...</p>
          {incomingCall.providerMetadata?.queueId && (
            <span className="inline-block mt-2 px-2 py-1 bg-gray-800 text-xs rounded text-gray-300">
              Queue: {incomingCall.providerMetadata.queueId}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 grid grid-cols-2 gap-4 bg-gray-50">
          <button
            onClick={() => endCall(incomingCall.id, token)}
            className="flex flex-col items-center justify-center p-4 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors active:scale-95"
          >
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-xl mb-2 shadow-sm">
              📞
            </div>
            <span className="font-semibold">Decline</span>
          </button>

          <button
            onClick={() => answerCall(incomingCall.id, user.id, token)}
            className="flex flex-col items-center justify-center p-4 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors active:scale-95"
          >
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl mb-2 shadow-sm animate-bounce">
              📞
            </div>
            <span className="font-semibold">Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
