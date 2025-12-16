import { Call } from '@psynq/core';

export interface CallApiPort {
  // Call CRUD operations
  getActiveCalls(): Promise<Call[]>;
  getCall(callId: string): Promise<Call>;
  createCall(from: string, to: string): Promise<Call>;

  // Call actions
  answerCall(callId: string, agentId: string): Promise<Call>;
  holdCall(callId: string): Promise<Call>;
  resumeCall(callId: string): Promise<Call>;
  endCall(callId: string): Promise<Call>;

  // Real-time subscriptions
  subscribeToCallUpdates(callback: (call: Call) => void): () => void;
  subscribeToNewCalls(callback: (call: Call) => void): () => void;
}