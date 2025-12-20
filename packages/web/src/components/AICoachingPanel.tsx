import React from 'react';

interface AICoachingPanelProps {
  tips: { id: string; text: string; timestamp: Date }[];
}

export function AICoachingPanel({ tips }: AICoachingPanelProps) {
  return (
    <div className="flex flex-col h-full bg-blue-50 border-l border-blue-100 p-4">
      <div className="flex items-center space-x-2 mb-4">
        <div className="bg-blue-600 p-1.5 rounded">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Live AI Coaching</h2>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1">
        {tips.length === 0 ? (
          <div className="text-xs text-blue-400 italic italic mt-10 text-center">
            Waiting for call audio to provide real-time tips...
          </div>
        ) : (
          tips.map((tip) => (
            <div key={tip.id} className="bg-white p-3 rounded-lg shadow-sm border border-blue-200 animate-in slide-in-from-right duration-300">
              <p className="text-sm text-gray-800 leading-snug">{tip.text}</p>
              <span className="text-[10px] text-gray-400 mt-2 block">
                {tip.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
