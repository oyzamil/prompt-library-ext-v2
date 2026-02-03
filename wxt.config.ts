import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import removeConsole from 'vite-plugin-remove-console';
import { defineConfig } from 'wxt';
import appConfig from './src/app.config';

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: (configEnv: { mode: string }) => ({
    plugins: configEnv.mode === 'production' ? [removeConsole({ includes: ['log'] }), tailwindcss()] : [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Disable compression for easier debugging
      minify: configEnv.mode === 'production',
      sourcemap: false,
    },
  }),
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  srcDir: 'src',
  autoIcons: {
    baseIconPath: 'assets/icon.png',
	sizes: [128, 64, 48, 32, 16],
  },
  manifest: ({ browser, manifestVersion, mode, command }) => {
    const defaultChrome = '509806635063-m19ppgekifuo0jhlrjpsshahp59m38bf';
    const defaultWeb = '509806635063-b3lip3rck8qcu1lm2vfsjuud39gfjtuk';
    const finalChromeClientId = import.meta.env.WXT_CHROME_APP_CLIENT_ID_PREFIX || defaultChrome;
    const finalWebClientId = import.meta.env.WXT_WEB_APP_CLIENT_ID_PREFIX || defaultWeb;

    // console.log({finalChromeClientId, finalWebClientId});

    // development
    const manifestBase: any = {
      name: appConfig.APP.fullName,
      description: '__MSG_appDescription__',
      default_locale: 'en',
      permissions: ['storage', 'contextMenus', 'identity'],
      oauth2: {
        client_id: `${finalChromeClientId}.apps.googleusercontent.com`,
        scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      },
      commands: {
        'open-prompt-selector': {
          suggested_key: {
            default: 'Ctrl+Shift+P',
            mac: 'Command+Shift+P',
          },
          description: '__MSG_openPromptSelector__',
        },
        'save-selected-prompt': {
          suggested_key: {
            default: 'Ctrl+Shift+S',
            mac: 'Command+Shift+S',
          },
          description: '__MSG_saveSelectedPrompt__',
        },
      },
      web_accessible_resources: [
        {
          resources: ['fonts/*'],
          matches: ['<all_urls>'],
        },
      ],
    };
    if (browser === 'firefox') {
      manifestBase.browser_specific_settings = {
        gecko: {
          data_collection_permissions: {
            required: ['none'],
          },
        },
      };
    }
    if (mode === 'development') {
      manifestBase.key =
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1gIStuzmtlJx9myPcEdZVB6fN6HZ4RDB2FNbhhhd1Q8kopHP3uZioJmGAbZch13CNg4nwDLzkT/Iv+SuQ92r6wEYf14rwv0pyLvegLlTWcKvpG+XfJXMl0AT32Gj2tuOoMceEpNRXZzcPf2QTftX4Lm3Kzv3kmeaIzHps1ajkT18iagllKExzmiQVZjCw/t8NYcY5cdjKQRhQqDTDqv5HnVanucEWmDPMb+AlyHOqAYxDurSt/IX1C5TW/khkCU8Fahcnw50ppVgIVKT7OLtSKDDNlqbC4BWIFWu55S5UR/CZNEbyjDtxzLkfVTi8sov7ZOUCTjEvRwjNmwXbo8PZwIDAQAB';
    }

    return manifestBase;
  },
});
