import { create } from 'zustand';
import { SettingsApiPort, Organization, Setting } from '../ports/settings-api.port';
import { useAuthStore } from './auth.store';

interface SettingsState {
  tenants: Organization[];
  currentTenant: Organization | null;
  settings: Record<string, Setting>;
  isLoading: boolean;
  error: string | null;
}

interface SettingsActions {
  setApiAdapter: (adapter: SettingsApiPort) => void;
  loadTenants: () => Promise<void>;
  createTenant: (name: string, slug: string) => Promise<void>;
  loadSetting: (key: string) => Promise<void>;
  updateSetting: (key: string, value: any, isSecret: boolean) => Promise<void>;
  loadAllSystemSettings: () => Promise<void>;
  loadStorageConfig: () => Promise<void>;
  updateStorageConfig: (provider: string, config: any) => Promise<void>;
  testStorage: () => Promise<{ healthy: boolean; provider: string; message: string }>;
  loadTelephonyConfig: () => Promise<void>;
  updateTelephonyConfig: (trunk: string, config: any) => Promise<void>;
  loadRecordingConfig: () => Promise<void>;
  updateRecordingConfig: (config: {
    enabled?: boolean;
    autoDeleteDays?: number;
    format?: string;
    path?: string;
  }) => Promise<void>;
}

let apiAdapter: SettingsApiPort | null = null;

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  tenants: [],
  currentTenant: null,
  settings: {},
  isLoading: false,
  error: null,

  setApiAdapter: (adapter: SettingsApiPort) => {
    apiAdapter = adapter;
  },

  loadTenants: async () => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const tenants = await apiAdapter.listTenants(token);
      set({ tenants, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTenant: async (name: string, slug: string) => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      await apiAdapter.createTenant(name, slug, token);
      await get().loadTenants();
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadSetting: async (key: string) => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const setting = await apiAdapter.getSetting(key, token);
      set((state) => ({
        settings: { ...state.settings, [key]: setting },
      }));
    } catch (error) {
      console.error(`Failed to load setting ${key}:`, error);
    }
  },

  updateSetting: async (key: string, value: any, isSecret: boolean) => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      await apiAdapter.setSetting(key, value, isSecret, token);
      await get().loadSetting(key);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadAllSystemSettings: async () => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const allSettings = await apiAdapter.getAllSystemSettings(token);
      set({ settings: allSettings, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadStorageConfig: async () => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const config = await apiAdapter.getStorageConfig(token);
      set((state) => ({
        settings: {
          ...state.settings,
          'storage.config': { key: 'storage.config', value: config, isSecret: false },
        },
      }));
    } catch (error) {
      console.error('Failed to load storage config:', error);
    }
  },

  updateStorageConfig: async (provider: string, config: any) => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      await apiAdapter.updateStorageConfig(provider, config, token);
      await get().loadStorageConfig();
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  testStorage: async () => {
    if (!apiAdapter) {
      throw new Error('API adapter not initialized');
    }
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      return await apiAdapter.testStorage(token);
    } catch (error) {
      throw error;
    }
  },

  loadTelephonyConfig: async () => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const config = await apiAdapter.getTelephonyConfig(token);
      set((state) => ({
        settings: {
          ...state.settings,
          'telephony.config': { key: 'telephony.config', value: config, isSecret: false },
        },
      }));
    } catch (error) {
      console.error('Failed to load telephony config:', error);
    }
  },

  updateTelephonyConfig: async (trunk: string, config: any) => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      await apiAdapter.updateTelephonyConfig(trunk, config, token);
      await get().loadTelephonyConfig();
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadRecordingConfig: async () => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const config = await apiAdapter.getRecordingConfig(token);
      set((state) => ({
        settings: {
          ...state.settings,
          'recording.config': { key: 'recording.config', value: config, isSecret: false },
        },
      }));
    } catch (error) {
      console.error('Failed to load recording config:', error);
    }
  },

  updateRecordingConfig: async (config: {
    enabled?: boolean;
    autoDeleteDays?: number;
    format?: string;
    path?: string;
  }) => {
    if (!apiAdapter) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      await apiAdapter.updateRecordingConfig(config, token);
      await get().loadRecordingConfig();
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));
