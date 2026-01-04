'use client';

import React, { useState, useEffect } from 'react';
import { useCallStore } from '@/stores/call.store';
import { useAuthStore } from '@/stores/auth.store';

export const Dialpad: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const { createCall, isLoading, isAudioReady } = useCallStore();
  const { token, user } = useAuthStore();
  
  const handleDigitPress = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleCall = async () => {
    if (!phoneNumber || !token) return;
    const from = user?.username || user?.id || 'sysadmin';
    await createCall(from, phoneNumber, token);
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  return (
    <div className="flex flex-col w-full max-w-xs bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {/* Display */}
      <div className="bg-gray-50 p-4 border-b border-gray-100">
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full text-2xl text-center bg-transparent outline-none font-mono text-gray-800"
          placeholder="Enter number..."
          readOnly
        />
      </div>

      {/* Keypad */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {keys.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleDigitPress(key)}
                className="h-14 w-14 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-xl font-semibold text-gray-700 transition-colors mx-auto"
                aria-label={`Dial ${key}`}
              >
                {key}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Actions */}
      <div className="p-4 flex justify-center items-center gap-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={handleBackspace}
          className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-gray-700"
          aria-label="Backspace"
        >
          ⌫
        </button>
        <button
          onClick={handleCall}
          disabled={!phoneNumber || isLoading || !isAudioReady}
          className={`h-14 w-14 rounded-full flex items-center justify-center text-white text-xl shadow-md transition-all ${
            !phoneNumber || isLoading
              ? 'bg-green-300 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 active:scale-95'
          }`}
          aria-label="Call"
        >
          📞
        </button>
      </div>
    </div>
  );
};
