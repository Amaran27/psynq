import React from 'react';
import { AgentStatus } from '@psynq/core';

interface AgentStatusSelectorProps {
  currentStatus: AgentStatus;
  onStatusChange: (newStatus: AgentStatus) => void;
  disabled?: boolean;
}

const statusColors: Record<AgentStatus, string> = {
  [AgentStatus.AVAILABLE]: 'bg-green-500',
  [AgentStatus.BUSY]: 'bg-red-500',
  [AgentStatus.BREAK]: 'bg-yellow-500',
  [AgentStatus.WRAP_UP]: 'bg-blue-500',
  [AgentStatus.OFFLINE]: 'bg-gray-500',
};

export function AgentStatusSelector({ currentStatus, onStatusChange, disabled }: AgentStatusSelectorProps) {
  return (
    <div className="flex items-center space-x-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className={`w-3 h-3 rounded-full ${statusColors[currentStatus] || 'bg-gray-400'}`} />
      <select
        className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none disabled:opacity-50"
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value as AgentStatus)}
        disabled={disabled}
      >
        {Object.values(AgentStatus).map((status) => (
          <option key={status} value={status}>
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}