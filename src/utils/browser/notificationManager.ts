import { t } from '@/utils/i18n';

// Setup notification click handlers
export const setupNotificationHandlers = (): void => {
  // Handle notification click event
  if (browser.notifications && browser.notifications.onClicked) {
    browser.notifications.onClicked.addListener(async (notificationId) => {
      if (notificationId === 'shortcut-config-issue') {
        console.log('Background script: The user clicked the shortcut key to configure the notification');

        try {
          // Detect the browser type and open the corresponding shortcut key setting page
          const isFirefox = navigator.userAgent.includes('Firefox');
          const shortcutSettingsUrl = isFirefox ? 'about:addons' : 'chrome://extensions/shortcuts';

          await browser.tabs.create({ url: shortcutSettingsUrl });

          // clear notification
          await browser.notifications.clear(notificationId);

          // If it is Firefox, display additional prompts
          if (isFirefox) {
            setTimeout(async () => {
              await browser.notifications.create('firefox-shortcut-tip', {
                type: 'basic',
                iconUrl: '/icon/32.png',
                title: 'Prompt Library - Setup prompts',
                message: t('shortcutSetupTip'),
              });
            }, 1000);
          }
        } catch (error) {
          console.error('Background script: Failed to open shortcut key setting page:', error);
        }
      }

      // Clear Firefox notifications
      if (notificationId === 'firefox-shortcut-tip') {
        setTimeout(async () => {
          await browser.notifications.clear(notificationId);
        }, 5000);
      }
    });
  }
};
