import { t } from '@/utils/i18n';

//Detect shortcut key configuration status
export const checkShortcutConfiguration = async (): Promise<void> => {
  try {
    console.log('Background script: Start detecting shortcut key configuration status');

    // Get all configured commands
    const commands = await browser.commands.getAll();
    const promptCommand = commands.find((cmd) => cmd.name === 'open-prompt-selector');
    const saveCommand = commands.find((cmd) => cmd.name === 'save-selected-prompt');

    // Check the main prompt word selector shortcut keys
    let shortcutIssues: string[] = [];

    if (!promptCommand || !promptCommand.shortcut) {
      shortcutIssues.push('The prompt word selector shortcut key was not configured successfully (there may be a conflict)');
      console.log('Background script: Prompt word selector shortcut key configuration failed');
    } else {
      console.log('Background script: Prompt word selector shortcut keys configured successfully:', promptCommand.shortcut);
    }

    if (!saveCommand || !saveCommand.shortcut) {
      shortcutIssues.push('The save prompt word shortcut key was not configured successfully (there may be a conflict)');
      console.log('Background script: Failed to save prompt word shortcut key configuration');
    } else {
      console.log('Background script: Save prompt word shortcut key configuration successfully:', saveCommand.shortcut);
    }

    //Storage shortcut key configuration status for use by pop-up windows and options pages
    await browser.storage.local.set({
      shortcut_check_result: {
        hasIssues: shortcutIssues.length > 0,
        issues: shortcutIssues,
        promptShortcut: promptCommand?.shortcut || null,
        saveShortcut: saveCommand?.shortcut || null,
        checkedAt: Date.now(),
      },
    });
  } catch (error) {
    console.error('Background script: Error while detecting shortcut key configuration:', error);
  }
};

// Handle keyboard commands
export const handleCommand = async (command: string): Promise<void> => {
  if (command === 'open-prompt-selector') {
    console.log(t('backgroundShortcutOpenSelector'));
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        await browser.tabs.sendMessage(tabs[0].id, { action: 'openPromptSelector' });
        console.log(t('backgroundShortcutSelectorSent'));
      } else {
        console.error(t('backgroundNoActiveTab'));
      }
    } catch (error) {
      console.error(t('backgroundSendMessageError'), error);
    }
  } else if (command === 'save-selected-prompt') {
    console.log(t('backgroundSaveShortcut'));
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        const response = await browser.tabs.sendMessage(tabs[0].id, { action: 'getSelectedText' });
        if (response && response.text) {
          const optionsUrl = browser.runtime.getURL('/options.html');
          const urlWithParams = `${optionsUrl}?action=new&content=${encodeURIComponent(response.text)}`;
          await browser.tabs.create({ url: urlWithParams });
        } else {
          console.log(t('shortcutSaveNoTextResponse'));
        }
      } else {
        console.error(t('backgroundNoActiveTab'));
      }
    } catch (error) {
      console.error(t('backgroundGetSelectedTextError'), error);
    }
  }
};
