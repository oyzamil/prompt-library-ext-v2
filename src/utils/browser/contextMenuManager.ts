import { t } from '@/utils/i18n';

// Create context menu items
export const createContextMenus = (): void => {
  //Create a right-click menu item for the plug-in icon
  browser.contextMenus.create({
    id: 'open-options',
    title: t('promptManagement'),
    contexts: ['action'], //Plug-in icon right-click menu
  });

  browser.contextMenus.create({
    id: 'category-management',
    title: t('categoryManagement'),
    contexts: ['action'],
  });

  //Create page content right-click menu items
  browser.contextMenus.create({
    id: 'save-prompt',
    title: t('savePrompt'),
    contexts: ['selection'],
  });
};

// Handle context menu clicks
export const handleContextMenuClick = async (info: Browser.contextMenus.OnClickData, _tab?: Browser.tabs.Tab): Promise<void> => {
  if (info.menuItemId === 'save-prompt' && info.selectionText) {
    console.log('Background script: Right-click menu is clicked, text is selected:', info.selectionText);

    // Get option page URL
    const optionsUrl = browser.runtime.getURL('/options.html');

    //Add query parameters and pass the selected text
    const urlWithParams = `${optionsUrl}?action=new&content=${encodeURIComponent(info.selectionText)}`;

    //Open the options page in a new tab
    await browser.tabs.create({ url: urlWithParams });
  } else if (info.menuItemId === 'open-options') {
    //Open options page
    const optionsUrl = browser.runtime.getURL('/options.html');
    await browser.tabs.create({ url: optionsUrl });
  } else if (info.menuItemId === 'category-management') {
    //Open the category management page
    const optionsUrl = browser.runtime.getURL('/options.html#/categories');
    await browser.tabs.create({ url: optionsUrl });
  }
};
