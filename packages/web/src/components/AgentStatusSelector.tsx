'use client';

import React from 'react';
import { AgentStatus } from '@psynq/core';

interface AgentStatusSelectorProps {
  currentStatus: AgentStatus;
  onStatusChange: (newStatus: AgentStatus) => void;
  isLoading: boolean;
}

export function AgentStatusSelector({ currentStatus, onStatusChange, isLoading }: AgentStatusSelectorProps) {
  const statusOptions = Object.values(AgentStatus);

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="agent-status" className="text-sm text-gray-600">Status:</label>
      <select
        id="agent-status"
        className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-sm"
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value as AgentStatus)}
        disabled={isLoading}
      >
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
