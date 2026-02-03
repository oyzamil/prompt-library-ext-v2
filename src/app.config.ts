import { defineAppConfig } from 'wxt/utils/define-app-config';
export const config = {
  APP: {
    name: 'Prompt Library',
    fullName: 'Prompt Library: LLM Prompt Saver & Organizer',
    tagLine: 'Organize, save and manage your prompts',
    color: '#006251',
    font: 'Poppins',
    storageBucket: 'prompt-library-settings',
    extensionPage: 'https://softwebtuts.com/prompt-library-browser-extension/',
  },
  SETTINGS: {
    theme: 'light' as 'light' | 'dark' | 'system',
    email: null as string | null,
    licenseModalVisible: false,
    freeUserLimit: 20,
    licenseInfo: {
      email: null as string | null,
      isLicensed: false,
      licenseKey: null as null | string,
      verificationDate: '' as string | number,
      consecutiveFailures: 0 as number,
      subscriptionId: null as null | string,
      subscriptionStatus: 'inactive',
      lastSuccessfulCheck: '' as string,
      error: '' as string,
    },
    closeModalOnOutsideClick: true as boolean,
  },
  ROUTES: {
    HOME: '/',
    LOGIN: '/login',
  },
  GUMROAD: {
    GUMROAD_PRODUCT_ID: 'IkZtJL4SZ2H3TPKSQEdRsg==',
    GUMROAD_URL: 'https://muzammilweb.gumroad.com/l/prompt-library', // BAAD63FF-C437429A-9F9FDE24-F23315F3
  },
};

export default defineAppConfig(config);

export type Settings = typeof config.SETTINGS;

declare module 'wxt/utils/define-app-config' {
  export interface WxtAppConfig {
    APP: typeof config.APP;
    SETTINGS: typeof config.SETTINGS;
    ROUTES: typeof config.ROUTES;
    GUMROAD: typeof config.GUMROAD;
  }
}
