import { config, Settings } from '@/app.config';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type SettingsStore = {
  settings: Settings;
  saveSettings: (patch: DeepPartial<Settings>) => void;
  removeSettings: (keys: (keyof Settings)[]) => void;
  resetSettings: () => void;
};

const throttleMs = 800; // Adjust as needed (500-1200ms is typical for good UX)

// Base adapter for browser.storage.local
const baseChromeAdapter = {
  getItem: (name: string) =>
    new Promise<string | null>((resolve) => {
      browser.storage.local.get([name], (result) => {
        const val = result[name];
        resolve(val != null ? JSON.stringify(val) : null);
      });
    }),

  setItem: (name: string, value: string) =>
    new Promise<void>((resolve) => {
      browser.storage.local.set({ [name]: JSON.parse(value) }, () => resolve());
    }),

  removeItem: (name: string) =>
    new Promise<void>((resolve) => {
      browser.storage.local.remove([name], () => resolve());
    }),
};

// Wrap setItem with throttle for delayed writes
const throttledSetItem = throttle(baseChromeAdapter.setItem, throttleMs, {
  leading: false, // Don't write immediately
  trailing: true, // Write after the last call in the throttle window
});

// Custom storage with throttled writes
const throttledChromeAdapter = {
  ...baseChromeAdapter,
  setItem: throttledSetItem,
};

const chromeJSONStorage = createJSONStorage(() => throttledChromeAdapter);

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: config.SETTINGS,

      saveSettings: (patch: DeepPartial<Settings>) =>
        set((state) => ({
          settings: deepMerge(state.settings, patch),
        })),

      removeSettings: (keys: (keyof Settings)[]) =>
        set((state) => {
          const updated = { ...state.settings };
          for (const key of keys) {
            delete updated[key];
          }
          return { settings: updated };
        }),

      resetSettings: () => set({ settings: config.SETTINGS }),
    }),
    {
      name: config.APP.storageBucket,
      storage: chromeJSONStorage,
      partialize: (state) => ({ settings: state.settings }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsStore> | undefined;
        const merged = persisted?.settings
          ? deepMerge(config.SETTINGS, persisted.settings)
          : config.SETTINGS;
        return {
          ...currentState,
          settings: merged,
        };
      },
    }
  )
);

// Usage examples remain the same as in your original code
/*
//! Get the current state
const currentSettings = useSettingsStore.getState().settings;

//! Call actions directly
useSettingsStore.getState().saveSettings({ theme: 'dark' });
useSettingsStore.getState().removeSettings(['watermark']);
useSettingsStore.getState().resetSettings();

//! Subscribe to changes (optional)
const unsubscribe = useSettingsStore.subscribe((state) => {
  console.log('Settings changed:', state.settings);
});

//! Later, unsubscribe
unsubscribe();
*/
