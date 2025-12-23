import { create } from 'zustand';
import { HttpCallApiAdapter } from '../adapters/http-call-api.adapter';
import { HttpSettingsApiAdapter } from '../adapters/http-settings-api.adapter';
import { CallApiPort } from '../ports/call-api.port';
import { SettingsApiPort } from '../ports/settings-api.port';
import { AudioPort } from '../ports/audio.port';
import { SipJsAdapter } from '../adapters/sipjs-audio.adapter';

interface AdapterState {
  apiAdapter: CallApiPort | null;
  settingsAdapter: SettingsApiPort | null;
  audioAdapter: AudioPort | null;
}

interface AdapterActions {
  initializeAdapter: () => void;
}

export const useAdapterStore = create<AdapterState & AdapterActions>((set, get) => ({
  apiAdapter: null,
  settingsAdapter: null,
  audioAdapter: null,
  initializeAdapter: () => {
    if (!get().apiAdapter) {
      set({ apiAdapter: new HttpCallApiAdapter() });
    }
    if (!get().settingsAdapter) {
      set({ settingsAdapter: new HttpSettingsApiAdapter() });
    }
    if (!get().audioAdapter) {
      // Defaulting to SipJs (Asterisk) for our new architecture
      set({ audioAdapter: new SipJsAdapter() });
    }
  },
}));