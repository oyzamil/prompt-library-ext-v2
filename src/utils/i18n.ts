// Simple i18n utility function, using browser.i18n API
export function t(key: string, substitutions?: string[]): string {
  try {
    return browser.i18n.getMessage(key as any, substitutions);
  } catch (error) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }
}
