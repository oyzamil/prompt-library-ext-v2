import { NavLink } from 'react-router-dom';
import NotionLogo from './NotionLogo';
import { Button } from 'antd';
import { ApartmentOutlined, CloseOutlined, MenuOutlined, SettingOutlined, TagOutlined } from '@ant-design/icons';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-app-900/50 text-app-700 dark:text-app-300 border-r-2 border-app-700 dark:border-app-400 shadow-sm'
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
          <div className="mb-3 space-y-1">
            {/* <NavLink
              to="/integrations/notion"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <NotionLogo />
              {t('notionSync')}
            </NavLink> */}
            <NavLink
              to="/integrations/google"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <svg className="shrink-0 mr-2 w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              {t('googleAuth')}
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
