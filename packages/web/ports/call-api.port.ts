import { Call, AgentStatus } from '@psynq/core';

export interface CallApiPort {
  // Authentication
  login(username: string, password: string): Promise<{ access_token: string }>;
  decodeToken(token: string): any;

  // Agent Status
  updateAgentStatus(token: string, status: AgentStatus): Promise<void>;
  fetchAgentStatus(token: string): Promise<AgentStatus>;

  // Call CRUD operations
  getActiveCalls(token: string): Promise<Call[]>;
  getCall(callId: string, token: string): Promise<Call>;
  createCall(from: string, to: string, token: string): Promise<Call>;

  // Call actions
  answerCall(callId: string, agentId: string, token: string): Promise<Call>;
  holdCall(callId: string, token: string): Promise<Call>;
  resumeCall(callId: string, token: string): Promise<Call>;
  endCall(callId: string, token: string): Promise<Call>;

  // Telephony device actions
  getTelephonyToken(agentId: string, token: string): Promise<string>;

  // Real-time subscriptions
  subscribeToCallUpdates(callback: (call: Call) => void, token: string): () => void;
  subscribeToNewCalls(callback: (call: Call) => void, token: string): () => void;
  subscribeToIntelligenceEvents(callback: (event: any) => void, token: string): () => void;
}