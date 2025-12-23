import { Call, CallState, AgentStatus } from '@psynq/core';
import { AgentStatusSelector } from './AgentStatusSelector';
import { AICoachingPanel } from './AICoachingPanel';
import { useAuthStore } from '../stores/auth.store';

interface CallStats {
  activeCalls: number;
  ringingCalls: number;
  answeredCalls: number;
  onHoldCalls: number;
}

interface CallCenterViewProps {
  calls: Call[];
  currentCall: Call | null;
  tips: { id: string; callId: string; text: string; timestamp: Date }[];
  isLoading: boolean;
  error: string | null;
  stats: CallStats;
  agentStatus: AgentStatus;
  onUpdateAgentStatus: (status: AgentStatus) => void;
  onLogout: () => void;
  onCreateCall: (to: string) => void;
  onAnswerCall: (callId: string) => void;
  onHoldCall: (callId: string) => void;
  onResumeCall: (callId: string) => void;
  onEndCall: (callId: string) => void;
  onSelectCall: (callId: string | null) => void;
  onRetryTelephony?: () => void;
  isAudioReady?: boolean;
}

function formatDuration(startedAt?: string | Date, endedAt?: string | Date): string {
  if (!startedAt) return '--:--';
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const end = endedAt ? (endedAt instanceof Date ? endedAt : new Date(endedAt)) : new Date();
  const durationMs = end.getTime() - start.getTime();

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getStatusBadge(state: CallState): { text: string; color: string } {
  switch (state) {
    case CallState.RINGING:
      return { text: 'Ringing', color: 'bg-yellow-100 text-yellow-800' };
    case CallState.ANSWERED:
      return { text: 'Connected', color: 'bg-green-100 text-green-800' };
    case CallState.ON_HOLD:
      return { text: 'On Hold', color: 'bg-blue-100 text-blue-800' };
    case CallState.ENDED:
      return { text: 'Ended', color: 'bg-gray-100 text-gray-800' };
    default:
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
}

export function CallCenterView({
  calls,
  currentCall,
  tips,
  isLoading,
  error,
  stats,
  agentStatus,
  onUpdateAgentStatus,
  onLogout,
  onCreateCall,
  onAnswerCall,
  onHoldCall,
  onResumeCall,
  onEndCall,
  onSelectCall,
  onRetryTelephony,
  isAudioReady = false,
}: CallCenterViewProps) {
  const currentCallTips = tips.filter(t => t.callId === currentCall?.id);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b z-10">
        <div className="px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Psynq Console</h1>
            <AgentStatusSelector
              currentStatus={agentStatus}
              onStatusChange={onUpdateAgentStatus}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">Wallet Balance</span>
              <span className="text-sm font-mono font-bold text-green-600">$42.50</span>
            </div>
            
            <div className="h-8 w-[1px] bg-gray-200" />

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 leading-none">{useAuthStore.getState().user?.username || 'Agent'}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Level 4 Agent</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Call Controls & List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded shadow-sm">
              <div className="flex items-center justify-between">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={onRetryTelephony}
                    className="bg-white border border-red-400 text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium"
                  >
                    Retry Telephony
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active</p>
              <p className="text-2xl font-black text-gray-900">{stats.activeCalls}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ringing</p>
              <p className="text-2xl font-black text-yellow-500">{stats.ringingCalls}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Connected</p>
              <p className="text-2xl font-black text-green-500">{stats.answeredCalls}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">On Hold</p>
              <p className="text-2xl font-black text-blue-500">{stats.onHoldCalls}</p>
            </div>
          </div>

          {/* Dialpad Area */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Dialpad</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const to = formData.get('to') as string;
                  if (to) {
                    onCreateCall(to);
                    (e.target as HTMLFormElement).reset();
                  }
                }}
                className="flex gap-3"
              >
                <input
                  type="tel"
                  name="to"
                  placeholder="Enter phone number..."
                  required
                  disabled={!isAudioReady}
                  className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-lg font-mono tracking-widest disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isLoading || !isAudioReady}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-200"
                >
                  Call
                </button>
              </form>

              {!isAudioReady && (
                <p className="text-xs text-gray-400 mt-2">
                  Telephony unavailable. Try <button onClick={onRetryTelephony} className="underline text-gray-600">retrying</button> or check telephony service.
                </p>
              )}
            </div>
          </div>

          {/* Active Call Control */}
          {currentCall && (
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="px-8 py-6 flex justify-between items-center border-b border-gray-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="text-xl font-bold text-white tracking-tight">{currentCall.from}</h2>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    {getStatusBadge(currentCall.state).text} • {formatDuration(currentCall.startedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-gray-500 block">CALL ID</span>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">{currentCall.id.split('-')[0]}</span>
                </div>
              </div>
              
              <div className="p-8 grid grid-cols-4 gap-4">
                {currentCall.state === CallState.RINGING && currentCall.direction === 'inbound' && (
                  <button
                    onClick={() => onAnswerCall(currentCall.id)}
                    className="col-span-2 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-900/20"
                  >
                    Answer
                  </button>
                )}
                {currentCall.state === CallState.RINGING && (
                  <button
                    onClick={() => onEndCall(currentCall.id)}
                    className="col-span-2 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl"
                  >
                    Reject
                  </button>
                )}
                {currentCall.state === CallState.ANSWERED && (
                  <button
                    onClick={() => onHoldCall(currentCall.id)}
                    className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl"
                  >
                    Hold
                  </button>
                )}
                {currentCall.state === CallState.ON_HOLD && (
                  <button
                    onClick={() => onResumeCall(currentCall.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl"
                  >
                    Resume
                  </button>
                )}
                {(currentCall.state === CallState.ANSWERED || currentCall.state === CallState.ON_HOLD) && (
                  <button
                    onClick={() => onEndCall(currentCall.id)}
                    className="col-span-2 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20"
                  >
                    End Call
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List of Other Active Calls */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Call Queue</h2>
              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{calls.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {calls.length === 0 ? (
                <div className="p-12 text-center text-gray-300 font-medium italic">
                  No active calls in queue
                </div>
              ) : (
                calls.map((call) => (
                  <div 
                    key={call.id}
                    onClick={() => onSelectCall(call.id)}
                    className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-colors ${currentCall?.id === call.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${call.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {call.direction === 'inbound' ? '↙' : '↗'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{call.from}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{call.direction}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getStatusBadge(call.state).color}`}>
                        {getStatusBadge(call.state).text}
                      </span>
                      <p className="text-[10px] font-mono text-gray-400 mt-1">{formatDuration(call.startedAt, call.endedAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: AI Coaching Panel */}
        <div className="w-80 border-l border-gray-200">
          <AICoachingPanel tips={currentCallTips} isAudioReady={!!isAudioReady} />
        </div>
      </div>
    </div>
  );
}