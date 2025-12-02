import { StoreApi } from 'zustand';
import { StateStorage } from 'zustand/middleware';
import pkg from '@/../package.json';

export const manifest = browser.runtime.getManifest();

export const formattedDateTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

export const injectStyleToMainDom = (cssCode: string): HTMLStyleElement => {
  // Create a new <style> element
  const styleElement = document.createElement('style');

  // Set the CSS code as the content of the style element
  styleElement.textContent = cssCode;

  // Append the style element to the document's <head>
  document.head.appendChild(styleElement);

  // Return the created style element (optional)
  return styleElement;
};

export function getRuleBySelector(selector: string): CSSStyleRule | null {
  let matchedRule: CSSStyleRule | null = null;

  const styleSheets = document.styleSheets;

  for (let i = 0; i < styleSheets.length; i++) {
    const sheet = styleSheets[i];
    const rules = sheet.cssRules || [];

    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j];

      // Type guard: Check if the rule is a CSSStyleRule
      if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
        matchedRule = rule;
        break;
      }
    }
  }

  return matchedRule;
}

// Custom browser.storage.local wrapper
export const browserStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      browser.storage.local.get([name], (result) => {
        resolve(result[name] ? JSON.stringify(result[name]) : null);
      });
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      browser.storage.local.set({ [name]: JSON.parse(value) }, () => resolve());
    });
  },
  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve) => {
      browser.storage.local.remove([name], () => resolve());
    });
  },
};

// Utility: sync a Zustand store with browser.storage.local
export function syncStoreWithBrowserStorage<T extends object>(store: StoreApi<T>, storageKey: string) {
  // Listen for external changes in browser.storage.local
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[storageKey]) {
      const newValue = changes[storageKey].newValue;
      if (newValue?.state) {
        store.setState(newValue.state);
      }
    }
  });
}

export type PackageJson = typeof pkg;

export function readPackageJson(): PackageJson {
  return pkg; // ✔ Browser-safe
}

export function getPackageProp<K extends keyof PackageJson>(prop: K): PackageJson[K] {
  return pkg[prop];
}
