import { browserStorage, syncStoreWithBrowserStorage } from '@/utils';
import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';

const { SETTINGS } = useAppConfig();
type Settings = typeof SETTINGS;

function deepMerge<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  const output = { ...target };
  Object.keys(source).forEach((key) => {
    const sourceVal = source[key as keyof DeepPartial<T>];
    const targetVal = target[key as keyof T];

    if (sourceVal !== undefined) {
      if (typeof sourceVal === 'object' && sourceVal !== null && typeof targetVal === 'object' && targetVal !== null) {
        output[key as keyof T] = deepMerge(targetVal, sourceVal);
      } else {
        output[key as keyof T] = sourceVal as T[keyof T];
      }
    }
  });
  return output;
}

interface SettingsState {
  settings: Settings;
  loadingSettings: boolean;

  loadSettings: () => Promise<void>;
  saveSettings: (newSettings: DeepPartial<Settings>) => Promise<void>;
  removeSettings: (keys: keyof Settings | (keyof Settings)[]) => Promise<void>;
  clearSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettings = create<SettingsState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        settings: SETTINGS,
        loadingSettings: false,

        loadSettings: async () => {
          set({ loadingSettings: true });
          return new Promise<void>((resolve) => {
            browser.storage.local.get(['settings'], (result) => {
              const stored = (result['settings'] as Settings) || {};
              const merged = deepMerge(SETTINGS, stored);
              set({ settings: merged, loadingSettings: false });
              resolve();
            });
          });
        },

        saveSettings: async (newSettings) => {
          set({ loadingSettings: true });
          const merged = deepMerge(get().settings, newSettings);
          await browser.storage.local.set({ settings: merged });
          set({ settings: merged, loadingSettings: false });
        },

        removeSettings: async (keys) => {
          set({ loadingSettings: true });
          const current = { ...get().settings };
          if (typeof keys === 'string') {
            delete current[keys];
          } else {
            for (const key of keys) {
              delete current[key];
            }
          }
          await browser.storage.local.set({ settings: current });
          set({ settings: current, loadingSettings: false });
        },

        clearSettings: async () => {
          set({ loadingSettings: true });
          await browser.storage.local.remove('settings');
          set({ settings: SETTINGS, loadingSettings: false });
        },

        resetSettings: async () => {
          await get().loadSettings();
        },
      }),
      {
        name: 'settings', // 🔑 this only persists the `settings` object, not the whole store
        storage: createJSONStorage(() => browserStorage),
        partialize: (state) => ({ settings: state.settings }), // ✅ prevents nesting
      },
    ),
  ),
);

syncStoreWithBrowserStorage(useSettings, 'settings');
