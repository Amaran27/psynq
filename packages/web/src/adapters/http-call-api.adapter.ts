import { Call } from '@psynq/core';
import { io, Socket } from 'socket.io-client';
import { CallApiPort } from '../ports/call-api.port';
import { AgentStatus } from '@psynq/core';
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
      console.error('Telephony token fetch failed:', error);
      throw new Error(error.message || error.error || 'Failed to fetch telephony token');
    }

    const { token: twilioToken } = await response.json();
    return twilioToken;
  }

  // Update subscribe methods to include token if needed for authenticated WebSockets
  // For now, assuming socket.io client handles token through handshake or custom headers.
  // Ensure a single socket instance is used and created with the auth token
  private ensureSocket(token: string) {
    if (this.socket && this.socket.connected) return this.socket;

    // If an existing socket exists but is using a different token, disconnect and recreate
    if (this.socket && !this.socket.disconnected) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(this.baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    // Register both events once
    this.socket.on('callUpdate', (call) => {
      console.log('Received call update via WebSocket:', call);
      // emit an internal event that callers can attach to via callbacks
      // actual callback handling happens in subscribe methods below
    });

    this.socket.on('newCall', (call) => {
      console.log('Received new call via WebSocket:', call);
    });

    return this.socket;
  }

  subscribeToCallUpdates(callback: (call: Call) => void, token: string): () => void {
    const socket = this.ensureSocket(token);
    // Register the user's callback
    const handler = (call: Call) => callback(call);
    socket.on('callUpdate', handler);
    return () => socket.off('callUpdate', handler);
  }

  subscribeToNewCalls(callback: (call: Call) => void, token: string): () => void {
    const socket = this.ensureSocket(token);
    const handler = (call: Call) => callback(call);
    socket.on('newCall', handler);
    return () => socket.off('newCall', handler);
  }
}