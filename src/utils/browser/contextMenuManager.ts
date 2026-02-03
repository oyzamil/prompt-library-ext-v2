import { t } from '@/utils/i18n';

// Create context menu items only if they don't exist
export const createContextMenus = (): void => {
  const menusToCreate = [
    { id: 'open-options', title: t('promptManagement'), contexts: ['action'] },
    { id: 'category-management', title: t('categoryManagement'), contexts: ['action'] },
    { id: 'save-prompt', title: t('savePrompt'), contexts: ['selection'] },
  ];

  menusToCreate.forEach(menu => {
    try {
      browser.contextMenus.create(menu);
    } catch (err) {
      // Ignore "cannot create item with the same id" errors
      if (!err.message.includes('Cannot create item with the same id')) {
        console.error('Failed to create context menu:', err);
      }
    }
  });
};

// Handle context menu clicks
export const handleContextMenuClick = async (
  info: Browser.contextMenus.OnClickData,
  _tab?: Browser.tabs.Tab
): Promise<void> => {
  if (info.menuItemId === 'save-prompt' && info.selectionText) {
    console.log('Background script: Right-click menu clicked, selected text:', info.selectionText);

    const optionsUrl = browser.runtime.getURL('/options.html');
    const urlWithParams = `${optionsUrl}?action=new&content=${encodeURIComponent(info.selectionText)}`;
    await browser.tabs.create({ url: urlWithParams });
  } else if (info.menuItemId === 'open-options') {
    const optionsUrl = browser.runtime.getURL('/options.html');
    await browser.tabs.create({ url: optionsUrl });
  } else if (info.menuItemId === 'category-management') {
    const optionsUrl = browser.runtime.getURL('/options.html#/categories');
    await browser.tabs.create({ url: optionsUrl });
  }
};
