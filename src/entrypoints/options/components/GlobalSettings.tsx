import React, { useState, useEffect } from 'react';
import { Alert, Button, Card, Segmented, Switch } from 'antd';
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SectionHeading title={t('globalSettings')} description={t('globalSettingsDescription')} icon={<SettingOutlined className="text-white text-xl" />} />

        <div className="space-y-6">
          <Card
          
            title={
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-app-500 dark:bg-black rounded-lg flex items-center justify-center">
                  <SettingOutlined className="text-white" />
                </div>
                <span>App Settings</span>
              </div>
            }
            
          >
            <div className="flex w-full justify-between">
              <span>Theme</span>
              <span>
                <Segmented
                  value={settings.theme}
                  onChange={(theme: 'light' | 'dark' | 'system') => {
                    saveSettings({ theme });
                  }}
                  options={[
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                    { label: 'System', value: 'system' },
                  ]}
                  className="w-full"
                />
              </span>
            </div>
          </Card>
          <Card
            title={
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-app-500 dark:bg-black rounded-lg flex items-center justify-center">
                  <MessageOutlined className="text-white" />
                </div>
                <span>{t('modalBehavior')}</span>
              </div>
            }
            
          >
            <h3>{t('closeModalOnOutsideClick')}</h3>
            <div className="flex items-center">
              <p className="text-sm text-theme-dim mt-1">{t('closeModalOnOutsideClickDescription')}</p>
              <Switch
                checked={settings.closeModalOnOutsideClick}
                onChange={async (checked) => {
                  saveSettings({ closeModalOnOutsideClick: checked });
                }}
              />
            </div>
          </Card>

          {/*  */}
          <Card
            title={
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-app-500 dark:bg-black rounded-lg flex items-center justify-center">
                    <QuestionOutlined className="text-white" />
                  </div>
                  <span>{t('keyboardShortcuts')}</span>
                </div>
              </>
            }
            
          >
            {/*  */}
            <div className="space-y-4">
              <p className="text-sm text-theme-dim">{t('shortcutsDescription')}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-theme-dim rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium">{t('openPromptSelector')}</h4>
                    <p className="text-xs text-theme-dim">{t('openPromptSelectorDescription')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {shortcuts['open-prompt-selector'] ? <kbd className="dark:bg-black">{shortcuts['open-prompt-selector']}</kbd> : <span className="text-xs text-theme-dim">{t('notSet')}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-theme-dim rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium">{t('openOptionsPage')}</h4>
                    <p className="text-xs text-theme-dim">{t('openOptionsPageDescription')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {shortcuts['open-options'] ? <kbd className="dark:bg-black">{shortcuts['open-options']}</kbd> : <span className="text-xs text-theme-dim">{t('notSet')}</span>}
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
