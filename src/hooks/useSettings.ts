import { config } from '@/app.config';

/**
 * Hook to access settings store
 * Automatically returns memoized settings and actions
 */
export function useSettings() {
  // Select settings and actions individually to reduce re-renders
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const removeSettings = useSettingsStore((s) => s.removeSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  // Listen to external storage changes (e.g., multi-tab / extension sync)
  useEffect(() => {
    const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== 'local') return;

      // Check for the specific key used by Zustand persist
      const change = changes[config.APP.storageBucket]; // Your persist name
      if (!change?.newValue) return;

      try {
        // Parse the persisted state structure
        const persistedState =
          typeof change.newValue === 'string' ? JSON.parse(change.newValue) : change.newValue;

        // Extract settings from the persisted structure
        const nextSettings = persistedState?.state?.settings || persistedState?.settings;

        if (!nextSettings) {
          console.warn('No settings found in persisted state', persistedState);
          return;
        }

        const currentSettings = useSettingsStore.getState().settings;

        // Only update if settings actually changed
        if (!isDeepEqual(currentSettings, nextSettings)) {
          useSettingsStore.setState({ settings: nextSettings });
        }
      } catch (error) {
        console.error('Failed to parse settings from storage:', error);
      }
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  return {
    settings,
    saveSettings,
    removeSettings,
    resetSettings,
  };
}
