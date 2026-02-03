import { CrownOutlined, KeyOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

const { APP } = useAppConfig();

function Header() {
  const { settings, saveSettings } = useSettings();

  return (
    <>
      <header className={'bg-app-500 z-51 flex w-full items-center px-2 py-3 dark:bg-black border-b border-theme'}>
        <Watermark className="w-full text-2xl" tagline={APP.tagLine} taglineClassName="text-[12px] text-theme-dim text-app-300" />
        <div className="flex flex-col items-end">
          {/* Header buttons  */}
          <div className="flex justify-between items-center gap-2 w-full">
            <Tooltip title={settings.licenseInfo.isLicensed ? 'Premium User' : 'Buy / Activate'} defaultOpen={!settings.licenseInfo.isLicensed}>
              <Button
                type="primary"
                className="bg-app-700 dark:bg-app-900/50 border-none"
                onClick={() => {
                  saveSettings({ licenseModalVisible: true });
                }}
                icon={settings.licenseInfo.isLicensed ? <CrownOutlined /> : <KeyOutlined />}
                disabled={settings.licenseInfo.isLicensed}
              />
            </Tooltip>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
