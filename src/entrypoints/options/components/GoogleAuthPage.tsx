import React, { useState, useEffect, useRef } from 'react';
import { t } from '@/utils/i18n';
import SectionHeading from './SectionHeading';
import { GoogleOutlined, InfoCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import { Alert, Button, Card } from 'antd';

interface UserInfo {
  email: string;
  name: string;
  id?: string;
}

const GoogleAuthPage: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const periodicCheckerRef = useRef<number | null>(null);

  // Check user's login status
  useEffect(() => {
    checkAuthStatus();

    // Monitor authentication status changes
    const authStatusIntervalId = monitorAuthStatus();

    // Set up polling to check login status
    startPeriodicAuthCheck();

    // Clear timer when component is unloaded
    return () => {
      stopPeriodicAuthCheck();

      // Clear the timer for monitoring authentication status
      if (authStatusIntervalId) {
        window.clearInterval(authStatusIntervalId);
      }
    };
  }, []);

  // Start checking your login status regularly
  const startPeriodicAuthCheck = () => {
    // Check login status every 10 seconds
    periodicCheckerRef.current = window.setInterval(async () => {
      const result = await browser.storage.local.get('google_user_info');
      // Update only when status changes
      if ((result.google_user_info && !user) || (!result.google_user_info && user)) {
        console.log(t('loginStatusChanged'));
        if (result.google_user_info) {
          setUser(result.google_user_info);
          setError(null);
        } else {
          setUser(null);
        }
      }
    }, 10000);
  };

  // Stop regular inspections
  const stopPeriodicAuthCheck = () => {
    if (periodicCheckerRef.current) {
      window.clearInterval(periodicCheckerRef.current);
      periodicCheckerRef.current = null;
    }
  };

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      // Get user information from local storage
      const result = await browser.storage.local.get('google_user_info');
      if (result.google_user_info) {
        setUser(result.google_user_info);
        setError(null); // Clear any error status
        console.log(t('foundLoggedInUser'), result.google_user_info);
        return true;
      }
      return false;
    } catch (error) {
      console.error(t('checkAuthStatusError'), error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(t('attemptGoogleLogin'));

      // The background script will set 'google_auth_status' to'in_progress'.
      // monitorAuthStatus will capture this status and display the corresponding information.
      await browser.runtime.sendMessage({
        action: 'authenticateWithGoogle',
        interactive: true,
      });

      // UI updates will be triggered by monitorAuthStatus when 'google_auth_status' === 'success' is detected,
      // Then call checkAuthStatus.
      // Note: setIsLoading(false) will be handled internally by monitorAuthStatus or checkAuthStatus.
    } catch (e: any) {
      // Here we mainly capture errors in sending the message itself
      const errorMessage = e?.message || t('loginProcessError');
      setError(errorMessage);
      console.error(t('googleLoginRequestError'), e);
      setIsLoading(false); // Make sure to stop loading when sending an error
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(t('loggingOutGoogle'));

      // Send logout request
      browser.runtime.sendMessage({ action: 'logoutGoogle' }).catch((e) => {
        console.error(t('logoutRequestError'), e);
      });

      // Create a logout status check function and wait for user information to be cleared
      const checkUntilLoggedOut = async (maxAttempts = 5) => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          // wait a short time
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Check if user is logged out
          const result = await browser.storage.local.get('google_user_info');
          if (!result.google_user_info) {
            console.log(t('confirmedLogout'));
            setUser(null);
            return true;
          }

          console.log(t('logoutCheckAttempt', [(attempt + 1).toString(), maxAttempts.toString()]));
        }

        return false;
      };

      // Start checking logout status
      const loggedOut = await checkUntilLoggedOut();

      if (loggedOut) {
        console.log(t('googleLogoutSuccess'));
      } else {
        // Try clearing local state even if check fails
        setUser(null);
        setError(t('logoutMaybeIncomplete'));
        console.warn(t('logoutProcessIncomplete'));
      }
    } catch (e: any) {
      const errorMessage = e?.message || t('logoutProcessError');
      setError(errorMessage);
      console.error(t('googleLogoutRequestError'), e);
    } finally {
      setIsLoading(false);
    }
  };

  // Monitor authentication status changes
  const monitorAuthStatus = () => {
    // Set up status change detection
    const checkInterval = window.setInterval(async () => {
      try {
        const result = await browser.storage.local.get('google_auth_status');
        if (result.google_auth_status) {
          const status = result.google_auth_status.status;
          const timestamp = result.google_auth_status.timestamp;

          // Only process status updates within the last 5 minutes
          const isRecent = Date.now() - timestamp < 5 * 60 * 1000;

          if (isRecent) {
            switch (status) {
              case 'in_progress':
                // isLoading should be set at the beginning of handleLogin. The error prompt can be optionally updated here.
                setError(t('loginInProgress'));
                setIsLoading(true); // Make sure loading is also shown when polling to in_progress
                break;
              case 'checking_session':
                setError(t('checkingLoginSession'));
                setIsLoading(true);
                break;
              case 'success':
                await checkAuthStatus(); // This will update the user state and possibly set isLoading(false)
                await browser.storage.local.remove('google_auth_status');
                setError(null); // Clear previous prompt information
                setIsLoading(false); // Explicitly stop loading
                break;
              case 'failed':
                setError(t('loginFailedTryAgain'));
                await browser.storage.local.remove('google_auth_status');
                setIsLoading(false);
                break;
              case 'error':
                setError(t('loginErrorTryLater'));
                await browser.storage.local.remove('google_auth_status');
                setIsLoading(false);
                break;
            }
          }
        }
      } catch (err) {
        console.error(t('monitorAuthStatusError'), err);
        // When a monitoring error occurs, loading should also be stopped to avoid the UI getting stuck.
        // setIsLoading(false); // Consider whether to add it, which may cause loading to disappear prematurely in an error state.
      }
    }, 1000); // Check every second

    // clearInterval will be called in the return function of useEffect
    return checkInterval;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <SectionHeading title={t('googleAuth')} description={t('googleAuthDescription')} icon={<GoogleOutlined className="text-white text-xl" />} />

        <Card
          title={
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <SafetyOutlined className="text-green-600" />
              </div>
              <span>{t('accountAuthentication')}</span>
            </div>
          }
          variant="borderless"
        >
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t('googleAuthDescription')}</p>
          </div>
          <div className="flex flex-col justify-center ">
            {user ? (
              <div className="flex flex-col items-center p-6 bg-gray-50/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center mb-3">
                  <span className="text-blue-600 dark:text-blue-200 text-2xl font-bold">{user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}</span>
                </div>
                <div className="text-center">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">{user.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{user.email}</p>
                  <Button
                    type="primary"
                    onClick={handleLogout}
                    disabled={isLoading}
                    icon={
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                      </svg>
                    }
                    danger
                  >
                    {t('logoutGoogle')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleLogin}
                loading={isLoading}
                icon={
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                }
              >
                {t('useGoogleLogin')}
              </Button>
            )}

            {error && <Alert description={<p className="text-red-700">{error}</p>} icon={<InfoCircleOutlined className="text-lg text-red-700" />} className="p-3 mt-4" type="error" showIcon />}
          </div>
        </Card>

        {/* Introduction */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <InfoCircleOutlined className="text-purple-600" />
              </div>
              <span>{t('googleAuthExplanation')}</span>
            </div>
          }
          variant="borderless"
        >
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <p>{t('googleAuthBenefits')}</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('secureCloudStorage')}</li>
              <li>{t('crossDeviceAccess')}</li>
              <li>{t('googleServiceIntegration')}</li>
            </ul>
            <p>{t('privacyAssurance')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GoogleAuthPage;
