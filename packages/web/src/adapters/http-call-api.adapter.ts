import { Call } from '@psynq/core';
import { io, Socket } from 'socket.io-client';
import { CallApiPort } from '../ports/call-api.port';
import { AgentStatus } from '../../backend/src/auth/enums/agent-status.enum'; // Import the enum
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

export class HttpCallApiAdapter implements CallApiPort {
  private baseUrl: string;
  private socket: Socket | null = null;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // Helper for authenticated requests
  private getAuthHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async login(username: string, password: string): Promise<{ access_token: string }> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    return response.json();
  }

  decodeToken(token: string): any {
    return jwtDecode(token);
  }

  async updateAgentStatus(token: string, status: AgentStatus): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/status`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update agent status');
    }
  }

  async fetchAgentStatus(token: string): Promise<AgentStatus> {
    const response = await fetch(`${this.baseUrl}/auth/status`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch agent status');
    }
    const data = await response.json();
    return data.status;
  }

  async getActiveCalls(token: string): Promise<Call[]> { // Add token parameter
    const response = await fetch(`${this.baseUrl}/calls`, {
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch active calls: ${response.statusText}`);
    }
    return response.json();
  }

  async getCall(callId: string, token: string): Promise<Call> { // Add token parameter
    const response = await fetch(`${this.baseUrl}/calls/${callId}`, {
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch call ${callId}: ${response.statusText}`);
    }
    return response.json();
  }

  async createCall(from: string, to: string, token: string): Promise<Call> { // Add token parameter
    const response = await fetch(`${this.baseUrl}/calls`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ from, to }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create call: ${response.statusText}`);
    }
    return response.json();
  }

  async answerCall(callId: string, agentId: string, token: string): Promise<Call> { // Add token parameter
    const response = await fetch(`${this.baseUrl}/calls/${callId}/answer`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ agentId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to answer call: ${response.statusText}`);
    }
    return response.json();
  }

  async holdCall(callId: string, token: string): Promise<Call> { // Add token parameter
    const response = await fetch(`${this.baseUrl}/calls/${callId}/hold`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to hold call: ${response.statusText}`);
    }
    return response.json();
  }

  async resumeCall(callId: string, token: string): Promise<Call> { // Add token parameter
    const response = await fetch(`${this.baseUrl}/calls/${callId}/resume`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to resume call: ${response.statusText}`);
    }
    return response.json();
  }

  async endCall(callId: string, token: string): Promise<Call> { // Add token parameter
    const response = await fetch(`${this.baseUrl}/calls/${callId}/end`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to end call: ${response.statusText}`);
    }
    return response.json();
  }

  async getTelephonyToken(agentId: string, token: string): Promise<string> { // Add token parameter
    const response = await fetch(`${this.baseUrl}/twilio/token`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ agentId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch telephony token');
    }

    const { token: twilioToken } = await response.json();
    return twilioToken;
  }

  // Update subscribe methods to include token if needed for authenticated WebSockets
  // For now, assuming socket.io client handles token through handshake or custom headers.
  subscribeToCallUpdates(callback: (call: Call) => void, token: string): () => void {
    if (this.socket) {
      this.socket.disconnect(); // Disconnect existing socket if any
    }
    this.socket = io(this.baseUrl.replace('http', 'ws'), {
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    this.socket.on('callUpdate', callback);
    return () => this.socket?.disconnect();
  }

  subscribeToNewCalls(callback: (call: Call) => void, token: string): () => void {
    if (!this.socket) { // Ensure socket is created if subscribeToCallUpdates wasn't called first
      this.socket = io(this.baseUrl.replace('http', 'ws'), {
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    this.socket.on('newCall', callback);
    return () => this.socket?.disconnect();
  }
}