import { Call } from '@psynq/core';
import { io, Socket } from 'socket.io-client';
import { CallApiPort } from '../ports/call-api.port';

export class HttpCallApiAdapter implements CallApiPort {
  private baseUrl: string;
  private socket: Socket | null = null;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async getActiveCalls(): Promise<Call[]> {
    const response = await fetch(`${this.baseUrl}/calls`);
    if (!response.ok) {
      throw new Error(`Failed to fetch active calls: ${response.statusText}`);
    }
    return response.json();
  }

  async getCall(callId: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch call ${callId}: ${response.statusText}`);
    }
    return response.json();
  }

  async createCall(from: string, to: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create call: ${response.statusText}`);
    }
    return response.json();
  }

  async answerCall(callId: string, agentId: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/answer`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agentId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to answer call: ${response.statusText}`);
    }
    return response.json();
  }

  async holdCall(callId: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/hold`, {
      method: 'PUT',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to hold call: ${response.statusText}`);
    }
    return response.json();
  }

  async resumeCall(callId: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/resume`, {
      method: 'PUT',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to resume call: ${response.statusText}`);
    }
    return response.json();
  }

  async endCall(callId: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/end`, {
      method: 'PUT',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to end call: ${response.statusText}`);
    }
    return response.json();
  }

  subscribeToCallUpdates(callback: (call: Call) => void): () => void {
    this.socket = io(this.baseUrl.replace('http', 'ws'));
    this.socket.on('callUpdate', callback);
    return () => this.socket?.disconnect();
  }

  subscribeToNewCalls(callback: (call: Call) => void): () => void {
    if (!this.socket) {
      this.socket = io(this.baseUrl.replace('http', 'ws'));
    }
    this.socket.on('newCall', callback);
    return () => this.socket?.disconnect();
  }
}