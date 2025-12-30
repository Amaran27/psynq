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
  initializeAudioAdapterOnDemand: () => Promise<void>;
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
  initializeAudioAdapterOnDemand: async () => {
    console.log('[AdapterStore] 🔍 initializeAudioAdapterOnDemand called');
    const audioAdapter = get().audioAdapter;
    if (!audioAdapter) {
      console.error('[AdapterStore] Audio adapter not initialized');
      return;
    }
    
    // Check if already initialized using the new isReady() method
    const sipAdapter = audioAdapter as any;
    console.log('[AdapterStore] 🔍 Checking if SIP adapter is ready...');
    if (sipAdapter.isReady && sipAdapter.isReady()) {
      console.log('[AdapterStore] Audio adapter already initialized, skipping');
      return;
    }
    
    console.log('[AdapterStore] 🔍 SIP adapter not initialized, proceeding with initialization...');
    // Perform actual SIP.js initialization
    if (sipAdapter.performInitialization) {
      console.log('%c[AdapterStore] 🔄 Calling performInitialization()...', 'color: #2196F3; font-weight: bold');
      await sipAdapter.performInitialization();
      console.log('%c[AdapterStore] ✅ performInitialization() completed', 'color: #4CAF50; font-weight: bold');
    }
  },
}));