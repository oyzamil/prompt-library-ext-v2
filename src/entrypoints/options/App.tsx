import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PromptManager from './components/PromptManager';
import CategoryManager from './components/CategoryManager';
import NotionIntegrationPage from './components/NotionIntegrationPage';
import GoogleAuthPage from './components/GoogleAuthPage';
import GlobalSettings from './components/GlobalSettings';
import ToastContainer from './components/ToastContainer';
import { t } from '@/utils/i18n';
import { AnimatePresence, motion } from 'framer-motion';
const App = () => {
  // Add back to top button related state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Theme switching logic
  useEffect(() => {
    document.title = t('promptLibrary');

    // Detect the system color mode and set the corresponding class
    const updateTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    };

    // Initial detection
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      updateTheme(true);
    }

    // Monitor system color mode changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      updateTheme(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Cleanup function
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Add scroll monitoring and return to top functions
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const shouldShow = scrollTop > 300;
      setShowBackToTop(shouldShow);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Back to top function
  const scrollToTop = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };
  const location = useLocation();
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto min-w-0">
          {/* Mobile top space (leave room for hamburger menu) */}
          <div className="md:hidden h-16 shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"></div>

          {/* main content area */}
          <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="h-full"
              >
                <Routes location={location} key={location.pathname}>
                  <Route path="" element={<PromptManager />} />
                  <Route path="categories" element={<CategoryManager />} />
                  <Route path="settings" element={<GlobalSettings />} />
                  <Route path="integrations/notion" element={<NotionIntegrationPage />} />
                  <Route path="integrations/google" element={<GoogleAuthPage />} />
                </Routes>
              </motion.div>
            </AnimatePresence>

            {/* back to top button */}
            {showBackToTop && (
              <div className="fixed bottom-6 right-6 z-9999">
                <button
                  onClick={scrollToTop}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  title={t('backToTop')}
                  aria-label={t('backToTop')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            )}

            {/* Add Toast notification container */}
            <ToastContainer />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
