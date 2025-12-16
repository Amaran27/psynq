import { Call } from '@psynq/core';
import { AgentStatus } from '../../backend/src/auth/enums/agent-status.enum';

export interface CallApiPort {
  // Authentication
  login(username: string, password: string): Promise<{ access_token: string }>;
  decodeToken(token: string): any;

  // Agent Status
  updateAgentStatus(token: string, status: AgentStatus): Promise<void>;
  fetchAgentStatus(token: string): Promise<AgentStatus>;

  // Call CRUD operations
  getActiveCalls(): Promise<Call[]>;
  getCall(callId: string): Promise<Call>;
  createCall(from: string, to: string): Promise<Call>;

  // Call actions
  answerCall(callId: string, agentId: string): Promise<Call>;
  holdCall(callId: string): Promise<Call>;
  resumeCall(callId: string): Promise<Call>;
  endCall(callId: string): Promise<Call>;

  // Telephony device actions
  getTelephonyToken(agentId: string): Promise<string>;

  // Real-time subscriptions
  subscribeToCallUpdates(callback: (call: Call) => void): () => void;
  subscribeToNewCalls(callback: (call: Call) => void): () => void;
}