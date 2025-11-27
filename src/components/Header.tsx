import logo from '@/assets/icon.png';
import { CrownOutlined, KeyOutlined } from '@ant-design/icons';
import { Avatar, Button, Tooltip } from 'antd';
import clsx from 'clsx';

const { APP } = useAppConfig();

const HeaderButtons = () => {
  const { settings, saveSettings } = useSettings();

  return (
    <>
      <div className="flex justify-between items-center gap-2 w-full">
        <Tooltip title={settings?.isLicensed ? 'Premium User' : 'Buy / Activate'} defaultOpen={!settings?.isLicensed}>
          <Button
            type="primary"
            onClick={() => {
              saveSettings({ licenseModalVisible: true });
            }}
            icon={settings?.isLicensed ? <CrownOutlined /> : <KeyOutlined />}
            disabled={settings?.isLicensed}
          />
        </Tooltip>
      </div>
    </>
  );
};

function Header() {
  return (
    <>
      <header className={'border-gray-200 px-2 flex py-3 items-center -mt-0.5 w-full z-51 bg-app-500/20'}>
        <Avatar src={logo} shape="square" className="size-12 mx-0.5 mr-2 border-none" alt="logo" />
        <div className="flex flex-col flex-1">
          <h1 className="text-md font-bold">{APP.NAME}</h1>
          <span className={clsx('text-gray-500', 'text-[12px]')}>{APP.TAGLINE}</span>
        </div>
        <div className="flex flex-col items-end">
          <HeaderButtons />
        </div>
      </header>
    </>
  );
}

export default Header;
