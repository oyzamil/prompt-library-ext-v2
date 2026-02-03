import { Alert, Button, Card, Divider, Input, Switch, Tag } from 'antd';
import { CheckOutlined, DeleteOutlined, InfoCircleFilled, PlusOutlined, SyncOutlined } from '@ant-design/icons';

interface NotionIntegrationProps {
  // No additional props required
}

// Define the type of sync state
interface SyncStatus {
  id: string;
  status: 'in_progress' | 'success' | 'error';
  startTime?: number;
  completedTime?: number;
  message?: string;
  error?: string;
  success?: boolean;
}

const NotionIntegration: React.FC<NotionIntegrationProps> = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [databaseId, setDatabaseId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testMessage, setTestMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isSyncToNotionEnabled, setIsSyncToNotionEnabled] = useState<boolean>(false);
  const messageTimeoutRef = useRef<number | null>(null);

  // New state: tracking sync IDs and polling timers
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const syncCheckIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadSettings();
    clearTemporaryMessages();
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      // Clean up polling timer
      if (syncCheckIntervalRef.current) {
        clearInterval(syncCheckIntervalRef.current);
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const result = await browser.storage.sync.get(['notionApiKey', 'notionDatabaseId', 'notionSyncToNotionEnabled']) as any;
      setApiKey(result.notionApiKey || '');
      setDatabaseId(result.notionDatabaseId || '');
      setIsSyncToNotionEnabled(result.notionSyncToNotionEnabled ?? false);
    } catch (error) {
      console.error(t('loadSettingsError'), error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTemporaryMessages = async () => {
    try {
      console.log('Clearing temporary messages...');
      // Get all locally stored data
      const allData = await browser.storage.local.get(null);
      const keysToRemove: string[] = [];

      // Find all temporary message keys and sync status keys
      Object.keys(allData).forEach((key) => {
        if (key.startsWith('temp_notion_message_') || key === 'notion_sync_status' || key === 'notion_from_sync_status') {
          keysToRemove.push(key);
        }
      });

      // Delete all temporary messages and sync status
      if (keysToRemove.length > 0) {
        await browser.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} Temporary messages and sync status`);
      }
    } catch (error) {
      console.error('Error cleaning temporary messages and sync status:', error);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    // Set local status first
    setTestMessage({ type, text });

    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    messageTimeoutRef.current = window.setTimeout(() => {
      setTestMessage(null);
      messageTimeoutRef.current = null;
    }, 5000);

    // Only success and error messages are saved to storage and displayed as Toast
    if (type === 'success' || type === 'error') {
      const statusKey = `temp_notion_message_${Date.now()}`;
      const statusValue = {
        id: `message_${Date.now()}`,
        status: type === 'success' ? 'success' : 'error',
        message: text,
        completedTime: Date.now(),
      };

      browser.storage.local.set({ [statusKey]: statusValue }).then(() => {
        // Automatically delete temporary messages after 5 seconds
        setTimeout(() => {
          browser.storage.local.remove(statusKey);
        }, 5000);
      });
    }
  };

  const saveSyncToNotionEnabled = async (enabled: boolean) => {
    try {
      await browser.storage.sync.set({ notionSyncToNotionEnabled: enabled });
    } catch (error) {
      console.error('Error saving Notion sync setting:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !databaseId) {
      showMessage('error', t('fillAPIKeyAndDatabaseID'));
      return;
    }
    try {
      // test connection
      const testResult = await testNotionConnection(apiKey, databaseId);

      if (testResult.success) {
        // Save settings
        await browser.storage.sync.set({
          notionApiKey: apiKey,
          notionDatabaseId: databaseId,
        });
        showMessage('success', t('connectionSuccessNotionSaved'));
      } else {
        showMessage('error', testResult.error || t('testConnectionError'));
      }
    } catch (error) {
      console.error(t('saveSettingsError'), error);
      showMessage('error', t('testConnectionError'));
    }
  };

  const testNotionConnection = async (key: string, dbId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
          'Notion-Version': '2022-06-28',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error(t('notionConnectionFailed'), errorData.message);
        return {
          success: false,
          error: errorData.message || t('notionConnectionFailed'),
        };
      }
      console.log(t('notionConnectionSuccessful'));
      return { success: true };
    } catch (error) {
      console.error(t('testConnectionError'), error);
      return {
        success: false,
        error: t('testConnectionError'),
      };
    }
  };

  const handleSyncToNotionToggle = async (enabled: boolean) => {
    setIsSyncToNotionEnabled(enabled);
    await saveSyncToNotionEnabled(enabled);
  };

  // Modify startSyncStatusPolling function
  const startSyncStatusPolling = (syncId: string, storageKey: string) => {
    if (syncCheckIntervalRef.current) {
      clearInterval(syncCheckIntervalRef.current);
    }
    setCurrentSyncId(syncId);

    syncCheckIntervalRef.current = window.setInterval(async () => {
      try {
        const result = (await browser.storage.local.get(storageKey)) as {
          [key: string]: SyncStatus;
        };
        const syncStatus = result[storageKey];

        if (syncStatus && syncStatus.id === syncId) {
          if (syncStatus.status === 'success' || syncStatus.status === 'error') {
            // No more messages, just clear local status
            clearInterval(syncCheckIntervalRef.current!);
            syncCheckIntervalRef.current = null;
            setCurrentSyncId(null);
            // No longer clearing state in storage immediately, letting ToastContainer handle it
          } else if (syncStatus.status === 'in_progress') {
            // Still in progress, polling continues but no messages are displayed
            console.log(`Sync ID ${syncId} is still in progress...`);
          }
        } else {
          // The current syncStatus has been cleared, indicating that synchronization has been completed.
          clearInterval(syncCheckIntervalRef.current!);
          syncCheckIntervalRef.current = null;
          setCurrentSyncId(null);
        }
      } catch (error) {
        console.error('Error polling sync status:', error);
        clearInterval(syncCheckIntervalRef.current!);
        syncCheckIntervalRef.current = null;
        setCurrentSyncId(null);
      }
    }, 2000); // Check every 2 seconds
  };

  // Modify the button click processing function synchronized to Notion
  const handleSyncToNotionClick = async () => {
    // Check if Notion is configured
    if (!apiKey || !databaseId) {
      showMessage('error', t('notionAPIKeyOrDatabaseNotConfigured'));
      return;
    }

    if (currentSyncId) {
      showMessage('info', t('syncTaskInProgress'));
      return;
    }
    try {
      // Only display the info message on the interface and do not save it to storage
      showMessage('info', t('startingSyncToNotion'));

      const response = await browser.runtime.sendMessage({
        action: 'syncToNotion',
        forceSync: true,
      });

      console.log(t('receivedSyncStartResponse'), response);

      if (response && response.syncInProgress && response.syncId) {
        // Directly set the synchronization status to in_progress and let ToastContainer display the loading status
        await browser.storage.local.set({
          notion_sync_status: {
            id: response.syncId,
            status: 'in_progress',
            message: t('syncingToNotionMessage'),
            startTime: Date.now(),
          },
        });

        // Start polling to check synchronization status
        startSyncStatusPolling(response.syncId, 'notion_sync_status');
      } else {
        showMessage('error', `${t('syncStartFailed')}: ${response?.error || t('unknownError')}`);
      }
    } catch (error) {
      console.error('Error triggering local to Notion sync:', error);
      showMessage('error', t('errorTriggeringSyncToNotion'));
    }
  };

  // Modify the button click processing function synchronized (overwritten) from Notion
  const handleSyncFromNotionReplaceClick = async () => {
    // Check if Notion is configured
    if (!apiKey || !databaseId) {
      showMessage('error', t('notionAPIKeyOrDatabaseNotConfigured'));
      return;
    }

    if (currentSyncId) {
      showMessage('info', t('syncTaskInProgress'));
      return;
    }
    try {
      // Only display the info message on the interface and do not save it to storage
      showMessage('info', t('startingNotionOverwriteSync'));

      const response = await browser.runtime.sendMessage({
        action: 'syncFromNotion',
        mode: 'replace',
      });
      console.log(t('receivedNotionOverwriteSyncResponse'), response);

      if (response && response.syncInProgress && response.syncId) {
        //Directly set the synchronization status to in_progress and let ToastContainer display the loading status
        await browser.storage.local.set({
          notion_from_sync_status: {
            id: response.syncId,
            status: 'in_progress',
            message: t('syncingFromNotionOverwriteMessage'),
            startTime: Date.now(),
          },
        });

        //Start polling to check synchronization status
        startSyncStatusPolling(response.syncId, 'notion_from_sync_status');
      } else {
        showMessage('error', `${t('syncStartFailed')}: ${response?.error || t('unknownError')}`);
      }
    } catch (error) {
      console.error('Error triggering Notion to local sync (replace):', error);
      showMessage('error', t('errorTriggeringNotionOverwriteSync'));
    }
  };

  // Modify the button click processing function synchronized (appended) from Notion
  const handleSyncFromNotionAppendClick = async () => {
    // Check if Notion is configured
    if (!apiKey || !databaseId) {
      showMessage('error', t('notionAPIKeyOrDatabaseNotConfigured'));
      return;
    }

    if (currentSyncId) {
      showMessage('info', t('syncTaskInProgress'));
      return;
    }
    try {
      // Only display the info message on the interface and do not save it to storage
      showMessage('info', t('startingNotionAppendSync'));

      const response = await browser.runtime.sendMessage({
        action: 'syncFromNotion',
        mode: 'append',
      });
      console.log(t('receivedNotionAppendSyncResponse'), response);

      if (response && response.syncInProgress && response.syncId) {
        // Directly set the synchronization status to in_progress and let ToastContainer display the loading status
        await browser.storage.local.set({
          notion_from_sync_status: {
            id: response.syncId,
            status: 'in_progress',
            message: t('syncingFromNotionAppendMessage'),
            startTime: Date.now(),
          },
        });

        // Start polling to check synchronization status
        startSyncStatusPolling(response.syncId, 'notion_from_sync_status');
      } else {
        showMessage('error', `${t('syncStartFailed')}: ${response?.error || t('unknownError')}`);
      }
    } catch (error) {
      console.error('Error triggering Notion to local sync (append):', error);
      showMessage('error', t('errorTriggeringNotionAppendSync'));
    }
  };

  if (isLoading) return <div className="p-4 font-medium text-center animate-pulse">{t('loadingNotionSettings')}</div>;

  return (
    <div className="space-y-4">
      {testMessage && (
        <div
          className={`mb-6 p-4 rounded-md border-l-4 shadow-sm ${
            testMessage.type === 'success'
              ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-200 dark:border-green-500'
              : testMessage.type === 'error'
                ? 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-200 dark:border-red-500'
                : 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-500'
          } flex items-center`}
        >
          <span className={`mr-2 shrink-0 ${testMessage.type === 'success' ? 'text-green-600' : testMessage.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
            {testMessage.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : testMessage.type === 'error' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </span>
          <span className="flex-1">{testMessage.text}</span>
        </div>
      )}

      <Card
        title={t('basicSettings')}
        extra={
          <a href="https://github.com/wenyuanw/quick-prompt/blob/main/docs/notion-sync-guide.md" target="_blank" rel="noopener noreferrer">
            <Button variant="dashed" color="blue">
              {t('configurationGuide')}
            </Button>
          </a>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="apiKey">{t('notionAPIKey')}</label>
            <Input type="password" id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={t('notionAPIKeyPlaceholder')} required />

            <Alert
              type="warning"
              description={
                <>
                  {t('notionAPIKeyHelp')}{' '}
                  <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    {t('notionIntegrationsPage')}
                  </a>{' '}
                  {t('notionAPIKeyHelp2')}
                </>
              }
            />
          </div>
          <Divider />
          <div className="space-y-1">
            <label htmlFor="databaseId">{t('notionDatabaseID')}</label>
            <Input id="databaseId" value={databaseId} onChange={(e) => setDatabaseId(e.target.value)} placeholder={t('notionDatabaseIDPlaceholder')} required />
            <Alert description={t('notionDatabaseIDHelp')} />
          </div>

          <Button type="primary" htmlType="submit" icon={<CheckOutlined />} block>
            {t('saveSettingsAndTest')}
          </Button>
        </form>
      </Card>

      <Card title={t('autoSyncSettings')}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="font-medium text-gray-700 text-md dark:text-gray-300">{t('enableAutoSync')}</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('autoSyncDescription')}</p>
          </div>
          <Switch checked={isSyncToNotionEnabled} onChange={handleSyncToNotionToggle} title={t('enableSync')} />
        </div>

        <Alert
          message={t('importantNotes')}
          description={
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{t('apiKeyStorageNote')}</li>
              <li>{t('permissionsNote')}</li>
            </ul>
          }
          type="warning"
        />
      </Card>

      <Card title={t('syncFromNotionToLocal')}>
        <div className="space-y-3">
          <div className="flex gap-3 flex-col md:flex-row">
            <Button type="primary" onClick={handleSyncFromNotionReplaceClick} disabled={currentSyncId !== null} icon={<DeleteOutlined />} danger block>
              {t('overwriteLocalData')}
            </Button>
            <Button type="primary" onClick={handleSyncFromNotionAppendClick} disabled={currentSyncId !== null} icon={<PlusOutlined />} block>
              {t('appendToLocal')}
            </Button>
          </div>

          <Card size="small">
            <ul className="space-y-1">
              <li>
                <Tag key="appendMode" color="blue-inverse" className="min-w-[110px] text-center">
                  {t('appendMode')}
                </Tag>
                {t('appendModeDescription')}
              </li>

              <li>
                <Tag key="overwriteMode" color="red-inverse">
                  {t('overwriteMode')}
                </Tag>
                {t('overwriteModeDescription')}
              </li>

              <li className="flex gap-2 text-red-500">
                <span>
                  <InfoCircleFilled />
                </span>
                {t('oneTimeOperationNote')}
              </li>
            </ul>
          </Card>
        </div>
      </Card>

      <Card title={t('syncFromLocalToNotion')}>
        <div className="mb-4">
          <Button type="primary" onClick={handleSyncToNotionClick} disabled={currentSyncId !== null} icon={<SyncOutlined />} block>
            {t('syncToNotion')}
          </Button>
        </div>

        <Card size="small">
          <div className="mb-2">{t('syncToNotionDescription')}</div>
          <ul className="space-y-1 list-disc ml-4">
            <li>{t('createMissingPrompts')}</li>
            <li>{t('updateChangedPrompts')}</li>
            <li>{t('markDeletedPrompts')}</li>
            <li className="flex gap-2 text-red-500">
              <span>
                <InfoCircleFilled />
              </span>
              {t('oneTimeOperationNote')}
            </li>
          </ul>
        </Card>
      </Card>
    </div>
  );
};

export default NotionIntegration;
