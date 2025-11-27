import { browserStorage, syncStoreWithBrowserStorage } from '@/utils';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type themes = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: themes;
  setTheme: (theme: themes) => void;
  reset: () => void;
}
// --- Store ---
const useConfigStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      reset: () => set({ theme: 'system' }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => browserStorage),
    },
  ),
);

syncStoreWithBrowserStorage(useConfigStore, 'theme-storage');

export default useConfigStore;
