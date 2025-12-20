import { Call } from '@psynq/core';
import { io, Socket } from 'socket.io-client';
import { CallApiPort } from '../ports/call-api.port';
import { AgentStatus } from '@psynq/core';
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

export class HttpCallApiAdapter implements CallApiPort {
  private baseUrl: string;
  private socket: Socket | null = null;
  private isEdge: boolean = false;

  constructor(baseUrl = null) {
    // If no baseUrl is provided, detect it from the current window location
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined') {
      // Use the current window hostname to avoid mismatches (localhost vs 127.0.0.1)
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      
      this.baseUrl = `${protocol}//${hostname}:3001`;
      
      console.log(`Resolved backend URL: ${this.baseUrl}`);
    } else {
      // Fallback for server-side rendering or non-browser environments
      this.baseUrl = 'http://127.0.0.1:3001';
    }
    
    // Detect Edge browser for special handling
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent;
      this.isEdge = userAgent.includes('Edg/') || userAgent.includes('Edge/');
      if (this.isEdge) {
        console.log('Edge browser detected, applying compatibility fixes');
      }
    }
  }

  // Helper for authenticated requests
  private getAuthHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Check if token is expired
  private isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      if (decoded.exp && decoded.exp < now) {
        console.warn('Token has expired:', decoded.exp, 'current time:', now);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error decoding token:', err);
      return true; // Assume expired if we can't decode it
    }
  }

  async login(username: string, password: string): Promise<{ access_token: string }> {
    console.log(`Attempting login to: ${this.baseUrl}/auth/login`);
    console.log(`Current window location: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log(`Login response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorDetails;
        try {
          errorDetails = await response.json();
        } catch (e) {
          errorDetails = { message: 'Login failed' };
        }
        console.error('Login failed:', errorDetails);
        
        // Provide more specific error messages
        if (response.status === 0) {
          throw new Error('Network error - unable to connect to server. This may be a CORS issue if accessing via localhost vs 127.0.0.1');
        } else if (response.status === 401) {
          throw new Error('Invalid credentials');
        } else if (response.status === 403) {
          throw new Error('Access forbidden - CORS issue likely');
        } else {
          throw new Error(errorDetails.message || `Login failed (${response.status})`);
        }
      }
      
      const result = await response.json();
      console.log('Login successful');
      return result;
    } catch (err) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        console.error('Login fetch error:', err);
        throw new Error(`Network error during login - this may be a CORS issue when accessing via localhost. Try using 127.0.0.1 instead. Original error: ${err.message}`);
      }
      throw err;
    }
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
    console.log(`Fetching telephony token for agent: ${agentId}, baseUrl: ${this.baseUrl}`);
    
    // Validate token before sending request
    if (!token) {
      console.error('No token provided for getTelephonyToken');
      throw new Error('Authentication token is required');
    }
    
    // Check if token is expired
    if (this.isTokenExpired(token)) {
      console.error('Token is expired, cannot fetch telephony token');
      throw new Error('Authentication token has expired - please log in again');
    }
    
    // Implement retry logic for browser compatibility
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${maxRetries} to fetch telephony token`);
        return await this._fetchTelephonyTokenWithRetry(agentId, token);
      } catch (err) {
        console.error(`Attempt ${attempt} failed:`, err);
        
        // Don't retry on authentication errors
        if (err instanceof Error && (
          err.message.includes('Authentication') || 
          err.message.includes('expired') ||
          err.message.includes('401') ||
          err.message.includes('403')
        )) {
          throw err;
        }
        
        // For network errors, retry if we haven't exhausted attempts
        if (attempt < maxRetries) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // Last attempt failed, throw the error
        throw err;
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error('Failed to fetch telephony token after all retries');
  }
  
  private async _fetchTelephonyTokenWithRetry(agentId: string, token: string): Promise<string> {
    
    try {
      const headers = this.getAuthHeaders(token);
      console.log('Request headers:', headers);
      
      // Enhanced fetch with browser compatibility options
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ agentId }),
        // Add these options for better browser compatibility
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'include',
      };
      
      // Edge-specific modifications
      if (this.isEdge) {
        // Edge sometimes has issues with AbortSignal.timeout
        // Create a manual timeout for Edge
        console.log('Applying Edge-specific fetch options');
        // Some versions of Edge prefer these settings
        fetchOptions.headers = {
          ...headers,
          'Connection': 'keep-alive',
        };
      }
      
      // Add timeout (with browser compatibility)
      try {
        // Try the modern approach first
        fetchOptions.signal = AbortSignal.timeout(10000); // 10 second timeout
      } catch (e) {
        // Fallback for browsers that don't support AbortSignal.timeout
        console.log('AbortSignal.timeout not supported, using manual timeout');
        const controller = new AbortController();
        fetchOptions.signal = controller.signal;
        setTimeout(() => controller.abort(), 10000);
      }
      
      const response = await fetch(`${this.baseUrl}/twilio/token`, fetchOptions);

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        // Try to parse JSON error if present
        let errorBody: any = null;
        try {
          errorBody = await response.json();
        } catch (e) {
          // ignore JSON parse errors
        }
        console.error('Telephony token fetch failed:', response.status, errorBody);
        
        // Provide more specific error messages based on status code
        if (response.status === 401) {
          throw new Error('Authentication failed - token may be expired or invalid');
        } else if (response.status === 403) {
          throw new Error('Access forbidden - insufficient permissions');
        } else if (response.status === 500) {
          throw new Error('Server error - please try again later');
        } else {
          throw new Error((errorBody && (errorBody.message || errorBody.error)) || `Failed to fetch telephony token (${response.status})`);
        }
      }

      const { token: twilioToken } = await response.json();
      console.log('Successfully retrieved telephony token');
      return twilioToken;
    } catch (err) {
      // Network / CORS / other fetch errors show up here as TypeError
      console.error('Telephony token request failed (network/CORS?):', err);
      
      // Check for specific error types with detailed messages
      if (err instanceof TypeError) {
        if (err.message.includes('Failed to fetch')) {
          // This is the specific error you're seeing in Edge
          if (this.isEdge) {
            console.error('Edge browser fetch issue detected');
            throw new Error('Edge browser network error - this may be due to Edge security settings or network policies. Try using Chrome or check your network configuration.');
          } else {
            console.error('Chrome fetch compatibility issue detected');
            throw new Error('Network error - browser unable to connect to server. This may be due to network policies or browser security settings.');
          }
        } else if (err.message.includes('fetch')) {
          throw new Error('Network error - unable to connect to server. Please check your connection.');
        } else if (err.message.includes('CORS')) {
          throw new Error('CORS error - server configuration issue');
        } else if (err.message.includes('network')) {
          throw new Error('Network error - please check your internet connection');
        }
      }
      
      // Handle AbortError from timeout
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timeout - server took too long to respond. Please try again.');
      }
      
      // Edge-specific fallback
      if (this.isEdge && err instanceof TypeError && err.message.includes('Failed to fetch')) {
        console.log('Attempting Edge fallback fetch method');
        try {
          return await this._edgeFallbackFetch(agentId, token);
        } catch (fallbackErr) {
          console.error('Edge fallback also failed:', fallbackErr);
        }
      }
      
      // Re-throw with more context
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch telephony token: ${errorMessage}`);
    }
  }
  
  // Edge-specific fallback method
  private async _edgeFallbackFetch(agentId: string, token: string): Promise<string> {
    console.log('Using Edge fallback fetch method');
    
    // Create a simple XMLHttpRequest as a fallback
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.baseUrl}/twilio/token`;
      const data = JSON.stringify({ agentId });
      
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      xhr.timeout = 10000; // 10 second timeout
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Edge fallback fetch successful');
            resolve(response.token);
          } catch (parseErr) {
            reject(new Error('Failed to parse response from Edge fallback'));
          }
        } else {
          reject(new Error(`Edge fallback failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Edge fallback network error'));
      };
      
      xhr.ontimeout = () => {
        reject(new Error('Edge fallback timeout'));
      };
      
      try {
        xhr.send(data);
      } catch (sendErr) {
        reject(new Error('Edge fallback send failed'));
      }
    });
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