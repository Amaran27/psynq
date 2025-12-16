import { Call, CallState } from '@psynq/core';

interface CallStats {
  activeCalls: number;
  ringingCalls: number;
  answeredCalls: number;
  onHoldCalls: number;
}

interface CallCenterViewProps {
  calls: Call[];
  currentCall: Call | null;
  isLoading: boolean;
  error: string | null;
  stats: CallStats;
  onCreateCall: (to: string) => void;
  onAnswerCall: (callId: string) => void;
  onHoldCall: (callId: string) => void;
  onResumeCall: (callId: string) => void;
  onEndCall: (callId: string) => void;
  onSelectCall: (callId: string | null) => void;
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
  isLoading,
  error,
  stats,
  onCreateCall,
  onAnswerCall,
  onHoldCall,
  onResumeCall,
  onEndCall,
  onSelectCall,
}: CallCenterViewProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Psynq Call Center</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Agent: John Doe</span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Calls</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.activeCalls}</p>
            {isLoading && <div className="mt-2 text-xs text-gray-500">Loading...</div>}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Ringing</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.ringingCalls}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Connected</h3>
            <p className="text-3xl font-bold text-green-600">{stats.answeredCalls}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">On Hold</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.onHoldCalls}</p>
          </div>
        </div>

        {/* Make Call Form */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Make Outbound Call</h2>
          </div>
          <div className="p-6">
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
              className="flex gap-4"
            >
              <input
                type="tel"
                name="to"
                placeholder="+1234567890"
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-md transition-colors"
              >
                Call
              </button>
            </form>
          </div>
        </div>
        {currentCall && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Current Call: {currentCall.from}
              </h2>
              <p className="text-sm text-gray-600">
                Status: {getStatusBadge(currentCall.state).text} | Duration: {formatDuration(currentCall.startedAt)}
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {currentCall.state === CallState.RINGING && currentCall.direction === 'inbound' && (
                  <button
                    onClick={() => onAnswerCall(currentCall.id)}
                    disabled={isLoading}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Answer Call
                  </button>
                )}
                {currentCall.state === CallState.ANSWERED && (
                  <button
                    onClick={() => onHoldCall(currentCall.id)}
                    disabled={isLoading}
                    className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Hold Call
                  </button>
                )}
                {currentCall.state === CallState.ON_HOLD && (
                  <button
                    onClick={() => onResumeCall(currentCall.id)}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Resume Call
                  </button>
                )}
                {(currentCall.state === CallState.ANSWERED || currentCall.state === CallState.ON_HOLD) && (
                  <button
                    onClick={() => onEndCall(currentCall.id)}
                    disabled={isLoading}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    End Call
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Calls Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Active Calls</h2>
          </div>
          <div className="overflow-x-auto">
            {calls.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {isLoading ? 'Loading calls...' : 'No active calls'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calls.map((call) => {
                    const statusBadge = getStatusBadge(call.state);
                    return (
                      <tr
                        key={call.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          currentCall?.id === call.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => onSelectCall(call.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {call.from}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(call.startedAt, call.endedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {call.state === CallState.RINGING && call.direction === 'inbound' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAnswerCall(call.id);
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Answer
                              </button>
                            )}
                            {call.state === CallState.ANSWERED && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onHoldCall(call.id);
                                  }}
                                  className="text-yellow-600 hover:text-yellow-900"
                                >
                                  Hold
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEndCall(call.id);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  End
                                </button>
                              </>
                            )}
                            {call.state === CallState.ON_HOLD && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onResumeCall(call.id);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Resume
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEndCall(call.id);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  End
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}