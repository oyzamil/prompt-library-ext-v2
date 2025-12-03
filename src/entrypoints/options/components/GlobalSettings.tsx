import React, { useState, useEffect } from 'react';
import { Alert, Button, Card, Switch } from 'antd';
import { MessageOutlined, QuestionOutlined, SettingOutlined } from '@ant-design/icons';
import SectionHeading from './SectionHeading';

const GlobalSettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [shortcuts, setShortcuts] = useState<{ [key: string]: string }>({});
  const { settings, saveSettings } = useSettings();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        try {
          const commands = await browser.commands.getAll();
          const shortcutMap: { [key: string]: string } = {};
          commands.forEach((command) => {
            if (command.name && command.shortcut) {
              shortcutMap[command.name] = command.shortcut;
            }
          });
          setShortcuts(shortcutMap);
        } catch (error) {
          console.warn('Unable to get shortcuts:', error);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const openShortcutSettings = () => {
    const isChrome = navigator.userAgent.includes('Chrome');
    const isFirefox = navigator.userAgent.includes('Firefox');

    if (isChrome) {
      browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
    } else if (isFirefox) {
      browser.tabs.create({ url: 'about:addons' });
    } else {
      alert(t('pleaseManuallyNavigateToShortcuts'));
    }
  };

  if (isLoading) {
    return <Loader text={t('loading')} />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SectionHeading title={t('globalSettings')} description={t('globalSettingsDescription')} icon={<SettingOutlined className="text-white text-xl" />} />

        <div className="space-y-6">
          <Card
            title={
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <MessageOutlined className="text-purple-600" />
                </div>
                <span>{t('modalBehavior')}</span>
              </div>
            }
            variant="borderless"
          >
            <h3>{t('closeModalOnOutsideClick')}</h3>
            <div className="flex items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('closeModalOnOutsideClickDescription')}</p>
              <Switch
                checked={settings.closeModalOnOutsideClick}
                onChange={async (checked) => {
                  await saveSettings({ closeModalOnOutsideClick: checked });
                }}
              />
            </div>
          </Card>

          {/*  */}
          <Card
            title={
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <QuestionOutlined className="text-green-600" />
                  </div>
                  <span>{t('keyboardShortcuts')}</span>
                </div>
              </>
            }
            variant="borderless"
          >
            {/*  */}
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('shortcutsDescription')}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('openPromptSelector')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('openPromptSelectorDescription')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {shortcuts['open-prompt-selector'] ? (
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                        {shortcuts['open-prompt-selector']}
                      </kbd>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{t('notSet')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('openOptionsPage')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('openOptionsPageDescription')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {shortcuts['open-options'] ? (
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                        {shortcuts['open-options']}
                      </kbd>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{t('notSet')}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button onClick={openShortcutSettings} type="primary" icon={<SettingOutlined />}>
                  {t('manageShortcuts')}
                </Button>
              </div>
            </div>
          </Card>

          <Alert
            message={t('helpAndTips')}
            description={
              <div className="text-xs space-y-2">
                <p>{t('globalSettingsHelpText1')}</p>
                <p>{t('globalSettingsHelpText2')}</p>
              </div>
            }
            type="warning"
            showIcon
            closable
          />
        </div>
      </div>
    </div>
  );
};

export default GlobalSettingsPage;
