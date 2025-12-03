import { BROWSER_STORAGE_KEY } from '@/utils/constants';
import { authenticateWithGoogle, logoutGoogle, USER_INFO_STORAGE_KEY } from '@/utils/auth/googleAuth';
import { syncFromNotionToLocal, syncLocalDataToNotion } from '@/utils/sync/notionSync';
import { t } from '@/utils/i18n';

// Main message handler
export const handleRuntimeMessage = async (message: any, sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  console.log('[MSG_RECEIVED V3] Background received message:', message, 'from sender:', sender);
  if (message.action === 'OPEN_LINK' && message?.url) {
    browser.tabs.create({ url: message.url });
    return { success: true };
  }

  // Existing message handlers
  if (message.action === 'getPrompts') {
    try {
      const result = await browser.storage.local.get(BROWSER_STORAGE_KEY);
      const allPrompts = (result[BROWSER_STORAGE_KEY as keyof typeof result] as PromptItem[]) || [];
      const enabledPrompts = allPrompts.filter((prompt: PromptItem) => prompt.enabled !== false);
      console.log(t('backgroundPromptsLoaded'), allPrompts.length, t('backgroundPromptsEnabled'), enabledPrompts.length, t('backgroundPromptsEnabledSuffix'));
      return { success: true, data: enabledPrompts };
    } catch (error) {
      console.error(t('backgroundGetPromptsError'), error);
      return { success: false, error: t('backgroundGetPromptsDataError') };
    }
  }

  if (message.action === 'openOptionsPage') {
    try {
      const optionsUrl = browser.runtime.getURL('/options.html');
      await browser.tabs.create({ url: optionsUrl });
      return { success: true };
    } catch (error) {
      console.error(t('backgroundOpenOptionsError'), error);
      browser.runtime.openOptionsPage();
      return { success: true, fallback: true };
    }
  }

  if (message.action === 'openOptionsPageWithText') {
    try {
      const optionsUrl = browser.runtime.getURL('/options.html');
      const urlWithParams = `${optionsUrl}?action=new&content=${encodeURIComponent(message.text)}`;
      await browser.tabs.create({ url: urlWithParams });
      return { success: true };
    } catch (error: any) {
      console.error(t('backgroundOpenOptionsWithTextError'), error);
      return { success: false, error: error.message };
    }
  }

  // +++ Consolidated Google Auth Message Handlers +++
  if (message.action === 'authenticateWithGoogle' || message.action === 'googleLogin') {
    // Handles both old and new action name for login
    console.log(`[MSG_AUTH V3] Processing '${message.action}' for interactive: ${message.interactive}`);

    //Define authentication status key, used to store authentication progress
    const AUTH_STATUS_KEY = 'google_auth_status';

    //Update authentication status
    const updateAuthStatus = async (status: string) => {
      await browser.storage.local.set({
        [AUTH_STATUS_KEY]: {
          status: status,
          timestamp: Date.now(),
        },
      });
    };

    // Mark the start of authentication
    await updateAuthStatus('in_progress');

    //In order to solve the timing problem between asynchronous operations and UI updates
    //Define response type
    interface AuthResponse {
      success: boolean;
      data?: {
        token: string;
        userInfo: { email: string; name: string; id: string };
      };
      error?: string;
    }

    let authPromise = new Promise<AuthResponse>(async (resolve) => {
      try {
        //Improve the authentication logic, try to use interactive login first, and if it fails, check the existing session
        let authResult = null;
        const isInteractive = message.interactive === true;

        console.log('[MSG_AUTH V3] Starting authentication process...');

        // First try to authenticate
        authResult = await authenticateWithGoogle(isInteractive);

        // Make sure we have enough time to wait for authentication to complete
        console.log('[MSG_AUTH V3] Initial auth attempt completed, checking result...');

        // If the interactive login fails but the account is already logged in in Chrome, try to obtain the existing session information
        if (!authResult && isInteractive) {
          console.log('[MSG_AUTH V3] Interactive auth failed, checking for existing session...');
          await updateAuthStatus('checking_session');
          // Check if user information already exists in local storage
          const storedInfo = await browser.storage.local.get(USER_INFO_STORAGE_KEY);
          if (storedInfo && storedInfo[USER_INFO_STORAGE_KEY]) {
            console.log('[MSG_AUTH V3] Found existing user info in storage');
            authResult = {
              token: 'session-token', //Use placeholder token
              userInfo: storedInfo[USER_INFO_STORAGE_KEY],
            };
          }
        }

        if (authResult && authResult.userInfo) {
          console.log('[MSG_AUTH V3] Authentication successful. User:', authResult.userInfo.email);
          // Core authenticateWithGoogle now handles storing to USER_INFO_STORAGE_KEY
          await updateAuthStatus('success');
          resolve({
            success: true,
            data: {
              token: authResult.token,
              userInfo: authResult.userInfo,
            },
          });
        } else {
          console.warn('[MSG_AUTH V3] Authentication failed or no user info.');
          await updateAuthStatus('failed');
          resolve({ success: false, error: t('backgroundLoginFailed') });
        }
      } catch (error: any) {
        console.error('[MSG_AUTH V3] Error during authenticateWithGoogle message processing:', error);
        await updateAuthStatus('error');
        resolve({ success: false, error: error.message || 'An unknown error occurred during authentication.' });
      }
    });

    // Use a more reliable asynchronous response mode
    authPromise.then((response) => {
      console.log('[MSG_AUTH V3] Sending final auth response:', response.success);
      sendResponse(response);
    });

    return true; // Indicate asynchronous response
  }

  if (message.action === 'logoutGoogle' || message.action === 'googleLogout') {
    // Handles both old and new action name for logout
    console.log(`[MSG_LOGOUT V3] Processing '${message.action}'`);

    //Define response type
    interface LogoutResponse {
      success: boolean;
      message?: string;
      error?: string;
    }

    // Use Promise to ensure that asynchronous processing is completed before responding
    const logoutPromise = new Promise<LogoutResponse>(async (resolve) => {
      try {
        await logoutGoogle(); // Core logoutGoogle handles token removal and USER_INFO_STORAGE_KEY
        console.log('[MSG_LOGOUT V3] Logout process completed by core function.');
        resolve({ success: true, message: 'Logout successful.' });
      } catch (e: any) {
        console.error('[MSG_LOGOUT V3] Error during logoutGoogle message processing:', e);
        resolve({ success: false, error: e.message || 'An unknown error occurred during logout.' });
      }
    });

    // Use a more reliable asynchronous response mode
    logoutPromise.then((response) => {
      console.log('[MSG_LOGOUT V3] Sending final logout response:', response.success);
      sendResponse(response);
    });

    return true; // Indicate asynchronous response
  }

  if (message.action === 'getUserStatus') {
    console.log('[MSG_GET_STATUS V3] Processing getUserStatus');
    try {
      const result = await browser.storage.local.get(USER_INFO_STORAGE_KEY);
      const userInfo = result[USER_INFO_STORAGE_KEY];
      if (userInfo) {
        sendResponse({ isLoggedIn: true, userInfo });
      } else {
        sendResponse({ isLoggedIn: false });
      }
    } catch (error: any) {
      console.error('[MSG_GET_STATUS V3] Error getting user status:', error);
      sendResponse({ isLoggedIn: false, error: error.message || 'Unknown error fetching status' });
    }
    return true; // Indicate asynchronous response
  }

  // Handle Notion sync messages if they are still relevant and managed here
  if (message.action === 'syncFromNotion' || message.action === 'syncFromNotionToLocal') {
    console.log(`Received ${message.action} message in background`);

    const syncId = Date.now().toString();

    // Notify the front end that synchronization has started - move before await
    sendResponse({
      success: true,
      syncInProgress: true,
      syncId: syncId,
      message: 'Synchronization from Notion has started and is being processed...',
    });

    //Asynchronously handle synchronous operations and store initial state
    (async function () {
      try {
        // Store sync state, marked as in progress - now inside an async block
        await browser.storage.local.set({
          notion_from_sync_status: {
            id: syncId,
            status: 'in_progress',
            startTime: Date.now(),
          },
        });

        console.log('[SYNC_FROM_NOTION_START] Beginning sync from Notion process');
        const success = await syncFromNotionToLocal(message.forceSync || false, message.mode || 'replace');
        console.log(`[SYNC_FROM_NOTION_COMPLETE] Sync from Notion ${success ? 'successful' : 'failed'}`);

        //Storage synchronization results
        await browser.storage.local.set({
          notion_from_sync_status: {
            id: syncId,
            status: success ? 'success' : 'error',
            success: success,
            message: success ? 'Synchronization from Notion successful!' : 'Synchronization failed, please check the console log',
            completedTime: Date.now(),
          },
        });
      } catch (error: any) {
        console.error('[SYNC_FROM_NOTION_ERROR] Error syncing from Notion:', error);

        // store error information
        await browser.storage.local.set({
          notion_from_sync_status: {
            id: syncId,
            status: 'error',
            success: false,
            error: error?.message || 'An unknown error occurred during synchronization from Notion',
            completedTime: Date.now(),
          },
        });
      }
    })();

    return true;
  }

  if (message.action === 'syncToNotion' || message.action === 'syncLocalToNotion') {
    console.log(`Received ${message.action} message in background`);

    const syncId = Date.now().toString();

    // Notify the front end that synchronization has started - move before await
    sendResponse({
      success: true,
      syncInProgress: true,
      syncId: syncId,
      message: 'Synchronization has started and is being processed...',
    });

    //Asynchronously handle synchronous operations and store initial state
    (async function () {
      try {
        // Store sync state, marked as in progress - now inside an async block
        await browser.storage.local.set({
          notion_sync_status: {
            id: syncId,
            status: 'in_progress',
            startTime: Date.now(),
          },
        });
        console.log('[SYNC_START] Beginning sync to Notion process');
        const result = await syncLocalDataToNotion(message.forceSync || false);
        console.log(`[SYNC_COMPLETE] Sync to Notion ${result.success ? 'successful' : 'failed'}`, result.errors || '');

        //Storage synchronization results
        if (result.success && !result.errors?.length) {
          // Completely successful
          await browser.storage.local.set({
            notion_sync_status: {
              id: syncId,
              status: 'success',
              success: true,
              message: 'Synchronization successful!',
              completedTime: Date.now(),
            },
          });
        } else if (result.success && result.errors?.length) {
          // Partially successful, with some errors
          await browser.storage.local.set({
            notion_sync_status: {
              id: syncId,
              status: 'error',
              success: true, // Still marked as having a certain level of success
              message: 'Partial synchronization was successful, but an error occurred',
              error: result.errors.join('\n'),
              completedTime: Date.now(),
            },
          });
        } else {
          // Complete failure
          await browser.storage.local.set({
            notion_sync_status: {
              id: syncId,
              status: 'error',
              success: false,
              message: 'Sync failed',
              error: result.errors ? result.errors.join('\n') : 'unknown error',
              completedTime: Date.now(),
            },
          });
        }
      } catch (error: any) {
        console.error('[SYNC_ERROR] Error syncing to Notion:', error);

        // store error information
        await browser.storage.local.set({
          notion_sync_status: {
            id: syncId,
            status: 'error',
            success: false,
            message: 'Sync failed',
            error: error?.message || 'An unknown error occurred during synchronization',
            completedTime: Date.now(),
          },
        });
      }
    })();

    return true;
  }
};
