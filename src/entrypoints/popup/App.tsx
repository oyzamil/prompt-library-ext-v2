import { Alert, Button, Card } from 'antd';

function App() {
  const [promptCount, setPromptCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shortcutKey, setShortcutKey] = useState<string>('');
  const [saveShortcutKey, setSaveShortcutKey] = useState<string>('');
  const [shortcutSettingsUrl, setShortcutSettingsUrl] = useState<string>('');
  const [showShortcutHelp, setShowShortcutHelp] = useState<boolean>(false);

  //Number of loading prompts
  const loadPromptCount = async () => {
    try {
      setLoading(true);

      // Get data directly from local storage
      try {
        const result = await browser.storage.local.get(BROWSER_STORAGE_KEY);
        const allPrompts = result.userPrompts || [];

        if (Array.isArray(allPrompts)) {
          //Only count the number of enabled prompt words
          const enabledPrompts = allPrompts.filter((prompt: any) => prompt.enabled !== false);
          setPromptCount(enabledPrompts.length);

          console.log(t('popupPromptsInfo', [allPrompts.length.toString(), enabledPrompts.length.toString()]));
        } else {
          setPromptCount(0);
        }
      } catch (storageErr) {
        console.error('Pop-up window: Failed to read storage directly', storageErr);
        setError(t('errorCannotReadStorage'));
        setPromptCount(0);
      }
    } catch (err) {
      console.error('Pop-up window: Error in loading prompt number', err);
      setError(t('errorCannotLoadPrompts'));
    } finally {
      setLoading(false);
    }
  };

  // Get the current shortcut key
  const getShortcutKey = async () => {
    try {
      //Detect the current browser type
      const isFirefox = navigator.userAgent.includes('Firefox');
      //Set the extension shortcut key setting page corresponding to the browser
      if (isFirefox) {
        setShortcutSettingsUrl('about:addons');
      } else {
        setShortcutSettingsUrl('chrome://extensions/shortcuts');
      }

      // Check if the user has chosen not to be reminded again
      const reminderSettings = await browser.storage.local.get('shortcut_reminder_dismissed');
      const isReminderDismissed = reminderSettings.shortcut_reminder_dismissed === true;

      // Get the real configured shortcut keys from the browser API
      const commands = await browser.commands.getAll();
      const commandMap = {
        prompt: commands.find((cmd) => cmd.name === 'open-prompt-selector'),
        save: commands.find((cmd) => cmd.name === 'save-selected-prompt'),
      };

      //Extract shortcut key string
      const shortcuts = {
        prompt: commandMap.prompt?.shortcut || '',
        save: commandMap.save?.shortcut || '',
      };

      // update status
      setShortcutKey(shortcuts.prompt);
      setSaveShortcutKey(shortcuts.save);

      // Determine whether to display help information: displayed when any shortcut key is not set and the user does not choose not to be reminded again
      const hasAllShortcuts = shortcuts.prompt && shortcuts.save;
      setShowShortcutHelp(!hasAllShortcuts && !isReminderDismissed);
    } catch (err) {
      console.error('Failed to obtain shortcut key settings', err);

      // Check if the user has chosen not to be reminded again
      try {
        const reminderSettings = await browser.storage.local.get('shortcut_reminder_dismissed');
        const isReminderDismissed = reminderSettings.shortcut_reminder_dismissed === true;

        // Prompt the user to enter the shortcut key setting page when an error occurs (if the user does not choose not to be reminded again)
        const isFirefox = navigator.userAgent.includes('Firefox');
        if (isFirefox) {
          setShortcutSettingsUrl('about:addons');
        } else {
          setShortcutSettingsUrl('chrome://extensions/shortcuts');
        }
        setShortcutKey('');
        setSaveShortcutKey('');
        setShowShortcutHelp(!isReminderDismissed);
      } catch (storageErr) {
        console.error('Check reminder settings failed', storageErr);
        // If the storage cannot be accessed, the reminder will still be displayed.
        setShowShortcutHelp(true);
      }
    }
  };

  // first load
  useEffect(() => {
    loadPromptCount();
    getShortcutKey();

    // Check system dark mode settings and apply
    const applySystemTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      //Apply dark mode to HTML elements
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Apply theme for the first time
    applySystemTheme();

    // Monitor system dark mode changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applySystemTheme();
    darkModeMediaQuery.addEventListener('change', listener);

    return () => {
      darkModeMediaQuery.removeEventListener('change', listener);
    };
  }, []);

  // Open the options page (in a new tab)
  const openOptionsPage = async () => {
    try {
      //Send a message to the background script requesting to open the options page in a new tab
      await browser.runtime.sendMessage({ action: 'openOptionsPage' });
      //Close popup window
      window.close();
    } catch (err) {
      console.error('Pop-up window: Error opening options page', err);
      // Fallback plan: directly use the API to open the options page
      browser.runtime.openOptionsPage();
    }
  };

  //Open the shortcut key setting page
  const openShortcutSettings = () => {
    // For Firefox, opening about:addons directly requires further operations from the user.
    if (navigator.userAgent.includes('Firefox')) {
      //Show additional hints
      alert(t('firefoxShortcutHelp'));
    }

    //Try to open the settings page
    try {
      browser.tabs.create({ url: shortcutSettingsUrl });
      window.close();
    } catch (err) {
      console.error('Failed to open shortcut key setting page', err);
    }
  };

  // No more reminders about shortcut key setting issues
  const dismissShortcutReminder = async () => {
    try {
      await browser.storage.local.set({
        shortcut_reminder_dismissed: true,
        shortcut_reminder_dismissed_at: Date.now(),
      });
      setShowShortcutHelp(false);
      console.log(t('popupShortcutReminderSet'));
    } catch (error) {
      console.error('Pop-up window: Error setting no reminders again:', error);
    }
  };

  return (
    <>
      <Header />
      <main className="p-3 pt-0 space-y-3">
        <div className="flex items-center justify-center flex-col">
          {loading ? (
            <Loader text="Fetching Prompts..." />
          ) : error ? (
            <div className="text-red-500 text-center text-sm dark:text-red-400">{error}</div>
          ) : (
            <>
              <span className="font-digital text-9xl text-app-500 dark:text-white">{promptCount}</span>
              <p>Available Prompts</p>
            </>
          )}
        </div>

        <Button onClick={openOptionsPage} type="primary" block>
          {t('managePrompts')}
        </Button>

        {/* Shortcut prompt area */}
        <Card className="" size="small" title={t('usage')}>
          <div className="flex items-start mb-2">
            <div className="shrink-0 text-app-500 dark:text-app-400 mr-2 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('quickInput')} <kbd>/p</kbd>
              {shortcutKey && (
                <>
                  {t('orPress')} <kbd>{shortcutKey}</kbd>
                </>
              )}
            </span>
          </div>

          {saveShortcutKey && (
            <div className="flex items-start mb-2">
              <div className="shrink-0 text-app-500 dark:text-app-400 mr-2 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {t('quickSave')} <kbd>{saveShortcutKey}</kbd> {t('savePrompt')}
              </span>
            </div>
          )}

          <div className="flex items-start mb-2">
            <div className="shrink-0 text-app-500 dark:text-app-400 mr-2 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t('rightClickSave')}</span>
          </div>

          {showShortcutHelp && (
            <Alert
              type="warning"
              description={
                <>
                  {t('shortcutNotConfigured')}
                  <div className="flex gap-2 mt-1">
                    <Button type="primary" onClick={openShortcutSettings} size="small">
                      {t('configureShortcut')}
                    </Button>
                    <Button onClick={dismissShortcutReminder} size="small" title={t('dismissReminderTitle')}>
                      {t('noReminder')}
                    </Button>
                  </div>
                </>
              }
              showIcon
            />
          )}
        </Card>
      </main>
    </>
  );
}

export default App;
