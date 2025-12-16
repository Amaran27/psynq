import { create } from 'zustand';
import { HttpCallApiAdapter } from '../adapters/http-call-api.adapter';
import { CallApiPort } from '../ports/call-api.port';

interface AdapterState {
  apiAdapter: CallApiPort | null;
}

interface AdapterActions {
  initializeAdapter: () => void;
}

export const useAdapterStore = create<AdapterState & AdapterActions>((set, get) => ({
  apiAdapter: null,
  initializeAdapter: () => {
    if (!get().apiAdapter) {
      set({ apiAdapter: new HttpCallApiAdapter() });
    }
  },
}));