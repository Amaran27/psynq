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
}));
