import { useState, useEffect, useCallback, useRef } from 'react';

const { SETTINGS } = useAppConfig();
type Settings = typeof SETTINGS;

/**
 * Deep merge two objects without changing references if values are identical.
 */
function deepMerge<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  const output = { ...target };

  Object.keys(source).forEach((key) => {
    const sourceVal = source[key as keyof DeepPartial<T>];
    const targetVal = target[key as keyof T];

    if (sourceVal === undefined) return;

    if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) && targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)) {
      output[key as keyof T] = deepMerge(targetVal, sourceVal);
    } else {
      output[key as keyof T] = sourceVal as T[keyof T];
    }
  });

  return output;
}

/**
 * Compare two objects deeply
 */
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return a === b;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => isEqual(a[key], b[key]));
}

// Global state management without external dependencies
class SettingsStore {
  private settings: Settings = SETTINGS;
  private listeners: Set<() => void> = new Set();
  private loadingSettings = false;
  private hasHydrated = false;
  private hydrationPromise: Promise<void> | null = null;

  constructor() {
    // Auto-hydrate on initialization
    this.hydrationPromise = this.loadSettings();
    this.setupStorageListener();
  }

  private setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes['settings']) {
        const newValue = changes['settings'].newValue;
        if (newValue && !isEqual(this.settings, newValue)) {
          this.settings = deepMerge(SETTINGS, newValue);
          this.notifyListeners();
        }
      }
    });
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  getState() {
    return {
      settings: this.settings,
      loadingSettings: this.loadingSettings,
      hasHydrated: this.hasHydrated,
    };
  }

  async waitForHydration() {
    if (this.hydrationPromise) {
      await this.hydrationPromise;
    }
  }

  async loadSettings(): Promise<void> {
    this.loadingSettings = true;
    this.notifyListeners();

    try {
      const result = await new Promise<Record<string, any>>((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
          resolve(result);
        });
      });

      const stored = (result['settings'] as Settings) || {};
      const merged = deepMerge(SETTINGS, stored);

      if (!isEqual(this.settings, merged)) {
        this.settings = merged;
      }

      this.hasHydrated = true;
      this.loadingSettings = false;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.hasHydrated = true;
      this.loadingSettings = false;
      this.notifyListeners();
    }
  }

  async saveSettings(newSettings: DeepPartial<Settings>): Promise<void> {
    const merged = deepMerge(this.settings, newSettings);

    // Only save if different
    if (isEqual(this.settings, merged)) {
      return;
    }

    this.loadingSettings = true;
    this.notifyListeners();

    try {
      await chrome.storage.local.set({ settings: merged });
      this.settings = merged;
      this.loadingSettings = false;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.loadingSettings = false;
      this.notifyListeners();
    }
  }

  async removeSettings(keys: keyof Settings | (keyof Settings)[]): Promise<void> {
    const current = { ...this.settings };
    const keysArray = typeof keys === 'string' ? [keys] : keys;

    keysArray.forEach((key) => {
      delete current[key];
    });

    // Only save if changed
    if (isEqual(this.settings, current)) {
      return;
    }

    this.loadingSettings = true;
    this.notifyListeners();

    try {
      await chrome.storage.local.set({ settings: current });
      this.settings = current;
      this.loadingSettings = false;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to remove settings:', error);
      this.loadingSettings = false;
      this.notifyListeners();
    }
  }

  async clearSettings(): Promise<void> {
    this.loadingSettings = true;
    this.notifyListeners();

    try {
      await chrome.storage.local.remove('settings');
      this.settings = SETTINGS;
      this.loadingSettings = false;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to clear settings:', error);
      this.loadingSettings = false;
      this.notifyListeners();
    }
  }

  async resetSettings(): Promise<void> {
    await this.loadSettings();
  }
}

// Singleton instance
const settingsStore = new SettingsStore();

/**
 * React hook to use settings with automatic hydration
 */
export function useSettings() {
  const [state, setState] = useState(() => settingsStore.getState());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Wait for initial hydration
    settingsStore.waitForHydration().then(() => {
      if (isMountedRef.current) {
        setState(settingsStore.getState());
      }
    });

    // Subscribe to changes
    const unsubscribe = settingsStore.subscribe(() => {
      if (isMountedRef.current) {
        setState(settingsStore.getState());
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const saveSettings = useCallback(async (newSettings: DeepPartial<Settings>) => {
    await settingsStore.saveSettings(newSettings);
  }, []);

  const removeSettings = useCallback(async (keys: keyof Settings | (keyof Settings)[]) => {
    await settingsStore.removeSettings(keys);
  }, []);

  const clearSettings = useCallback(async () => {
    await settingsStore.clearSettings();
  }, []);

  const resetSettings = useCallback(async () => {
    await settingsStore.resetSettings();
  }, []);

  const loadSettings = useCallback(async () => {
    await settingsStore.loadSettings();
  }, []);

  return {
    settings: state.settings,
    loadingSettings: state.loadingSettings,
    hasHydrated: state.hasHydrated,
    saveSettings,
    removeSettings,
    clearSettings,
    resetSettings,
    loadSettings,
  };
}

export async function getSettings() {
  return await settingsStore.loadSettings();
}
/**
 * Utility hook to check if settings have been hydrated
 */
export function useHydrated(): boolean {
  const { hasHydrated } = useSettings();
  return hasHydrated;
}
