import { create } from 'zustand';
import { CallApiPort } from '../ports/call-api.port';
import { AgentStatus } from '@psynq/core';

interface AuthState {
  isLoggedIn: boolean;
  user: { id: string; username: string; roles: string[]; organizationId?: string } | null;
  token: string | null;
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
}

let apiAdapter: CallApiPort | null = null;

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // State
  isLoggedIn: false,
  user: null,
  token: null,
  status: AgentStatus.AWAY, // Default status
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
      const user = localStorage.getItem('user_data');
      if (token && user) {
        set({
          isLoggedIn: true,
          token: token,
          user: JSON.parse(user),
        });
        // Also fetch agent status when re-loading session
        get().fetchAgentStatus();
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
      const decodedToken: any = apiAdapter.decodeToken(response.access_token);
      const user = {
        id: decodedToken.sub,
        username: decodedToken.username,
        roles: decodedToken.roles,
        organizationId: decodedToken.orgId,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('jwt_token', response.access_token);
        localStorage.setItem('user_data', JSON.stringify(user));
      }

      set({
        isLoggedIn: true,
        user,
        token: response.access_token,
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
      localStorage.removeItem('user_data');
    }
    set({ isLoggedIn: false, user: null, token: null, status: AgentStatus.AWAY });
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
        console.warn('Token expired:', new Date(decoded.exp * 1000));
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking authentication:', err);
      return false;
    }
  },
}));