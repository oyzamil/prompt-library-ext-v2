import { defineAppConfig } from 'wxt/utils/define-app-config';
export const config = {
  APP: {
    NAME: 'Prompt Library',
    TAGLINE: 'Organize, save and manage your prompts',
    DEVELOPER_MAIL: 'qazi.web@gmail.com',
    COLOR_PRIMARY: '#187b4d',
    FONT_FAMILY: 'Poppins',
  },
  SETTINGS: {
    theme: 'light' as 'light' | 'dark' | 'system',
    email: null as string | null,
    isLicensed: false,
    licenseModalVisible: false,
    freeUserLimit: 15,
    licenseInfo: {
      licenseKey: null as string | null,
      subscriptionId: null as string | null,
      status: null as string | null,
      verificationDate: null as string | null,
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

export type AppSettings = typeof config.SETTINGS;

declare module 'wxt/utils/define-app-config' {
  export interface WxtAppConfig {
    APP: typeof config.APP;
    SETTINGS: typeof config.SETTINGS;
    ROUTES: typeof config.ROUTES;
    GUMROAD: typeof config.GUMROAD;
  }
}
