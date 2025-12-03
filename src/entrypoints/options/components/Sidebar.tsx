import { NavLink } from 'react-router-dom';
import { Button } from 'antd';
import { ApartmentOutlined, CloseOutlined, MenuOutlined, SettingOutlined, TagOutlined } from '@ant-design/icons';
import { GoogleIcon, NotionIcon } from '@/icons';
import { useAntd } from '@/providers/ThemeProvider';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const { settings } = useSettings();
  const { message } = useAntd();

  useEffect(() => {
    if (!settings) return;
    setIsLimited(!settings.isLicensed);
  }, [settings]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const menuItems = [
    {
      path: '/',
      name: t('promptManagement'),
      icon: <ApartmentOutlined className="text-lg" />,
      description: t('promptManagementDescription'),
    },
    {
      path: '/categories',
      name: t('categoryManagement'),
      icon: <TagOutlined className="text-lg" />,
      description: t('promptCategoryManagement'),
    },
    {
      path: '/settings',
      name: t('globalSettings'),
      icon: <SettingOutlined className="text-lg" />,
      description: t('globalSettingsDescription'),
    },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {isMobile && !isOpen && <Button onClick={toggleSidebar} className="flex fixed top-20 left-4 z-50md:hidden p-5" aria-label={t('openMenu')} icon={<MenuOutlined />} />}

      {isMobile && isOpen && <div className="fixed inset-0 z-30 bg-black/10 backdrop-blur-sm md:hidden animate-fadeIn" onClick={closeSidebar} />}

      <aside
        className={`
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
          transition-all duration-300 ease-in-out flex flex-col
          ${isMobile ? 'fixed' : 'relative'} 
          ${isMobile ? 'z-40' : 'z-0'}
          ${isMobile ? 'h-[calc(100vh-72px)]' : 'h-auto'}
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
          ${isMobile ? 'shadow-2xl' : 'shadow-none'}
          ${isMobile && isOpen ? 'sidebar-enter' : ''}
          ${className}
        `}
        style={{
          width: isMobile ? '280px' : '256px',
        }}
      >
        <div className="p-3 flex flex-col grow">
          {isMobile && isOpen && (
            <div className="flex justify-end mb-4">
              <Button onClick={closeSidebar} aria-label={t('closeMenu')} type="text" icon={<CloseOutlined />} />
            </div>
          )}

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-3 text-sm font-medium rounded ${
                    isActive
                      ? 'bg-app-100/10 dark:bg-app-900/50 text-app-700 dark:text-app-300 border-l-2 rounded-l-none border-app-700 dark:border-app-400 shadow-sm'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 hover:shadow-sm'
                  }`
                }
              >
                <span className="shrink-0 mr-3">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mt-0.5">{item.description}</div>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* bottom area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 w-full">
          <div className="mb-3 flex flex-col gap-2">
            {/* Notion Link  */}
            {/* <NavLink to="/integrations/notion" className="w-full">
              {({ isActive }) => (
                <Button block variant={isActive ? 'solid' : 'filled'} color="default" onClick={closeSidebar} className="flex items-center gap-2">
                  <NotionIcon className="shrink-0 w-5 h-5" />
                  {t('notionSync')}
                </Button>
              )}
            </NavLink> */}

            {/* Google Link  */}
            <NavLink to={isLimited ? '' : '/integrations/google'} className="w-full" key="google-login">
              {({ isActive }) => (
                <Button
                  block
                  // disabled={isLimited}
                  variant={isActive ? 'solid' : 'filled'}
                  color="default"
                  onClick={() => {
                    if (isLimited) {
                      message.error(t('premiumRequiredMessage'));
                    }
                    closeSidebar();
                  }}
                  className="flex items-center gap-2"
                >
                  <GoogleIcon className="shrink-0 w-5 h-5" />
                  {t('googleAuth')}
                </Button>
              )}
            </NavLink>
          </div>
          <div className="space-y-1 text-xs text-center text-gray-500 dark:text-gray-400">
            <p>
              © {new Date().getFullYear()} {useAppConfig().APP.NAME}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
