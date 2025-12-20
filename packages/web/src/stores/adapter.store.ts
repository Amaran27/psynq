import { create } from 'zustand';
import { HttpCallApiAdapter } from '../adapters/http-call-api.adapter';
import { HttpSettingsApiAdapter } from '../adapters/http-settings-api.adapter';
import { CallApiPort } from '../ports/call-api.port';
import { SettingsApiPort } from '../ports/settings-api.port';

interface AdapterState {
  apiAdapter: CallApiPort | null;
  settingsAdapter: SettingsApiPort | null;
}

interface AdapterActions {
  initializeAdapter: () => void;
}

export const useAdapterStore = create<AdapterState & AdapterActions>((set, get) => ({
  apiAdapter: null,
  settingsAdapter: null,
  initializeAdapter: () => {
    if (!get().apiAdapter) {
      set({ apiAdapter: new HttpCallApiAdapter() });
    }
    if (!get().settingsAdapter) {
      set({ settingsAdapter: new HttpSettingsApiAdapter() });
    }
  },
}));