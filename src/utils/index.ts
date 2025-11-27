import consola from 'consola';
import { StoreApi } from 'zustand';
import { StateStorage } from 'zustand/middleware';
const isDev = import.meta.env.DEV;

export const manifest = browser.runtime.getManifest();

export const formattedDateTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

type LoggerMethods = {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  success: (...args: any[]) => void;
  start: (...args: any[]) => void;
  ready: (...args: any[]) => void;
  box: (...args: any[]) => void;
  fatal: (...args: any[]) => void;
  trace: (...args: any[]) => void;
};

const baseLogger: Partial<LoggerMethods> = isDev && typeof consola !== 'undefined' ? consola : console;

export const logger: LoggerMethods = new Proxy({} as LoggerMethods, {
  get(_, prop: keyof LoggerMethods) {
    if (prop in baseLogger && typeof baseLogger[prop] === 'function') {
      return baseLogger[prop]!.bind(baseLogger);
    }

    // Fallback: unknown method → console.log with tag
    return (...args: any[]) => console.log(`[${prop}]`, ...args);
  },
});

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.+$/, '') // Remove trailing dots
    .substring(0, 250); // Limit filename length
}

//hex to rgba with opacity
export function hexToRgba(hex: string, opacity: number): string {
  // Expand shorthand form (#RGB to #RRGGBB)
  if (/^#([a-f\d])([a-f\d])([a-f\d])$/i.test(hex)) {
    hex = hex.replace(/^#([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => '#' + r + r + g + g + b + b);
  }

  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) throw new Error('Invalid hex color');

  const [_, r, g, b] = match;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${opacity})`;
}

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
