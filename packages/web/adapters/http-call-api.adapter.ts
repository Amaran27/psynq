import { Call } from '@psynq/core';
import { io, Socket } from 'socket.io-client';
import { CallApiPort } from '@/ports/call-api.port';
import { AgentStatus } from '@psynq/core';
import { jwtDecode } from 'jwt-decode';

export class HttpCallApiAdapter implements CallApiPort {
  private baseUrl: string;
  private socket: Socket | null = null;

  constructor(baseUrl = null) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      this.baseUrl = `${protocol}//${hostname}:3001`;
    } else {
      this.baseUrl = 'http://127.0.0.1:3001';
    }
  }

  private getAuthHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'API Request failed');
    }
    return response.json();
  }

  async login(username: string, password: string): Promise<{ access_token: string }> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    return this.handleResponse(response);
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
    if (!response.ok) throw new Error('Failed to update status');
  }

  async fetchAgentStatus(token: string): Promise<AgentStatus> {
    const response = await fetch(`${this.baseUrl}/auth/status`, {
      headers: this.getAuthHeaders(token),
    });
    const data = await this.handleResponse(response);
    return data.status;
  }

  async getActiveCalls(token: string): Promise<Call[]> {
    const response = await fetch(`${this.baseUrl}/calls`, {
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getCall(callId: string, token: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}`, {
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  async createCall(from: string, to: string, token: string, agentId?: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ from, to, agentId }),
    });
    return this.handleResponse(response);
  }

  async answerCall(callId: string, agentId: string, token: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/answer`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ agentId }),
    });
    return this.handleResponse(response);
  }

  async holdCall(callId: string, token: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/hold`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  async resumeCall(callId: string, token: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/resume`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  async endCall(callId: string, token: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/end`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getTelephonyToken(agentId: string, token: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/telephony/token`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ agentId }),
    });
    return this.handleResponse(response);
  }

  private ensureSocket(token: string) {
    if (this.socket?.connected) return this.socket;

    console.log(`%c[HttpCallApiAdapter] Connecting to backend WebSocket at ${this.baseUrl}`, 'color: #2196F3');

    this.socket = io(this.baseUrl, {
      auth: { token }, // Correct way to pass token in browser
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Add connection event handlers for better debugging
    this.socket.on('connect', () => {
      console.log('%c[HttpCallApiAdapter] ✅ WebSocket connected successfully', 'color: #4CAF50; font-weight: bold');
    });

    this.socket.on('connect_error', (error) => {
      // Only log the first error to avoid spam
      if (!this.socket?.connected) {
        console.warn(
          '%c[HttpCallApiAdapter] ⚠️ WebSocket connection failed (will retry automatically)',
          'color: #FF9800; font-style: italic'
        );
        console.log('[HttpCallApiAdapter] This is normal if backend is still starting up...');
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[HttpCallApiAdapter] WebSocket disconnected:', reason);
    });

    return this.socket;
  }

  subscribeToCallUpdates(callback: (call: Call) => void, token: string): () => void {
    const socket = this.ensureSocket(token);
    socket.on('callUpdate', callback);
    return () => socket.off('callUpdate', callback);
  }

  subscribeToNewCalls(callback: (call: Call) => void, token: string): () => void {
    const socket = this.ensureSocket(token);
    socket.on('newCall', callback);
    return () => socket.off('newCall', callback);
  }

  subscribeToIntelligenceEvents(callback: (event: any) => void, token: string): () => void {
    const socket = this.ensureSocket(token);
    socket.on('intelligence.coaching_tip', callback);
    return () => socket.off('intelligence.coaching_tip', callback);
  }
}