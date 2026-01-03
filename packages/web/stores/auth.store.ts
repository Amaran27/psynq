import 'reflect-metadata';
import { create } from 'zustand';
import { CallApiPort } from '../ports/call-api.port';
import { AgentStatus } from '@psynq/core';

interface AuthState {
  isLoggedIn: boolean;
  user: { id: string; username: string; roles: string[]; organizationId?: string } | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  status: AgentStatus; // Agent status
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setApiAdapter: (adapter: CallApiPort) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadInitialAuth: () => void;
  updateAgentStatus: (status: AgentStatus) => Promise<void>;
  fetchAgentStatus: () => Promise<void>;
  isAuthenticated: () => boolean;
  refreshAuthToken: () => Promise<void>;
  shouldRefreshToken: () => boolean;
}

let apiAdapter: CallApiPort | null = null;

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // State
  isLoggedIn: false,
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiresAt: null,
  status: AgentStatus.OFFLINE, // Default status
  isLoading: false,
  error: null,

  // Actions
  setApiAdapter: (adapter: CallApiPort) => {
    apiAdapter = adapter;
    // Potentially load initial auth if token is in local storage
    get().loadInitialAuth();
  },

  loadInitialAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwt_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const user = localStorage.getItem('user_data');
      if (token && user) {
        // Verify token expiration locally before trusting it
        try {
          const decoded = apiAdapter?.decodeToken(token);
          const now = Date.now() / 1000;
          if (decoded && decoded.exp && decoded.exp < now) {
            get().logout();
            return;
          }
        } catch (e) {
          get().logout();
          return;
        }

        set({
          isLoggedIn: true,
          token: token,
          refreshToken: refreshToken,
          tokenExpiresAt: token ? (apiAdapter?.decodeToken(token)?.exp || null) * 1000 : null,
          user: JSON.parse(user),
        });
        // Also fetch agent status when re-loading session
        get().fetchAgentStatus().catch(() => {
          // If fetch fails (e.g. 401), logout automatically
          get().logout();
        });
      }
    }
  },

  login: async (username, password) => {
    if (!apiAdapter) {
      set({ error: 'API adapter not initialized' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await apiAdapter.login(username, password);
      const decodedToken: any = apiAdapter.decodeToken(response.accessToken);
      const user = {
        id: decodedToken.sub,
        username: decodedToken.username,
        roles: decodedToken.roles,
        organizationId: decodedToken.orgId,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('jwt_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        localStorage.setItem('user_data', JSON.stringify(user));
      }

      set({
        isLoggedIn: true,
        user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        tokenExpiresAt: decodedToken.exp * 1000,
        isLoading: false,
      });
      // Fetch agent status immediately after login
      await get().fetchAgentStatus();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
    }
    set({ 
      isLoggedIn: false, 
      user: null, 
      token: null, 
      refreshToken: null,
      tokenExpiresAt: null,
      status: AgentStatus.OFFLINE 
    });
  },

  updateAgentStatus: async (newStatus: AgentStatus) => {
    if (!apiAdapter || !get().token) {
      set({ error: 'Not authenticated or API adapter not initialized' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      await apiAdapter.updateAgentStatus(get().token as string, newStatus);
      set({ status: newStatus, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update status',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchAgentStatus: async () => {
    if (!apiAdapter || !get().token) {
      set({ error: 'Not authenticated or API adapter not initialized' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const fetchedStatus = await apiAdapter.fetchAgentStatus(get().token as string);
      set({ status: fetchedStatus, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch status',
        isLoading: false,
      });
      throw error;
    }
  },

  isAuthenticated: () => {
    const { token } = get();
    if (!token || !apiAdapter) return false;

    try {
      const decoded = apiAdapter.decodeToken(token);
      const now = Date.now() / 1000;
      if (decoded.exp && decoded.exp < now) {
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking authentication:', err);
      return false;
    }
  },

  shouldRefreshToken: () => {
    const { tokenExpiresAt } = get();
    if (!tokenExpiresAt) return false;
    
    // Refresh if token expires in less than 5 minutes
    const now = Date.now();
    const timeUntilExpiry = tokenExpiresAt - now;
    return timeUntilExpiry < 5 * 60 * 1000; // 5 minutes in milliseconds
  },

  refreshAuthToken: async () => {
    const { refreshToken: currentRefreshToken } = get();
    if (!currentRefreshToken || !apiAdapter) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('http://localhost:3001/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const decodedToken: any = apiAdapter.decodeToken(data.accessToken);

      if (typeof window !== 'undefined') {
        localStorage.setItem('jwt_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
      }

      set({
        token: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: decodedToken.exp * 1000,
      });

      return data.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      get().logout();
      throw error;
    }
  },
}));