import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import CategoryManager from './components/CategoryManager';
import GlobalSettings from './components/GlobalSettings';
import GoogleAuthPage from './components/GoogleAuthPage';
import NotionIntegrationPage from './components/NotionIntegrationPage';
import PromptManager from './components/PromptManager';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
const App = () => {
  const { settings } = useSettings();
  // Add back to top button related state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    <div className="h-screen flex flex-col transition-colors duration-200">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto min-w-0">
          {/* Mobile top space (leave room for hamburger menu) */}
          <div className="md:hidden h-16 shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"></div>

          {/* main content area */}
          <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
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
                  {settings.licenseInfo.isLicensed && (
                    <>
                      <Route path="integrations/notion" element={<NotionIntegrationPage />} />
                      <Route path="integrations/google" element={<GoogleAuthPage />} />
                    </>
                  )}
                </Routes>
              </motion.div>
            </AnimatePresence>

            {/* back to top button */}
            {showBackToTop && (
              <div className="fixed bottom-6 right-6 z-9999">
                <button
                  onClick={scrollToTop}
                  className="bg-app-600 hover:bg-app-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-app-500 focus:ring-offset-2"
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
