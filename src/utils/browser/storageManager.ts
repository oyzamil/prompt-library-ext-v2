import { BROWSER_STORAGE_KEY } from '@/utils/constants';
import { syncLocalDataToNotion } from '@/utils/sync/notionSync';

// Setup storage change listeners for auto-sync
export const setupStorageChangeListeners = (): void => {
  // Added: storage.onChanged listener for auto-sync Local -> Notion
  browser.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && changes[BROWSER_STORAGE_KEY]) {
      console.log('Local prompts data changed, checking if Notion sync (Local -> Notion) is needed...');
      const syncSettings = await browser.storage.sync.get('notionSyncToNotionEnabled');
      if (!!syncSettings.notionSyncToNotionEnabled) {
        console.log('Local data changed, Notion sync (Local -> Notion) is enabled. Triggering sync...');

        //Create a unique synchronization ID for automatic synchronization
        const syncId = `auto_${Date.now()}`;

        //Storage synchronization status is in progress
        await browser.storage.local.set({
          notion_sync_status: {
            id: syncId,
            status: 'in_progress',
            message: 'Automatically syncing to Notion, please wait...',
            startTime: Date.now(),
          },
        });

        try {
          //Perform synchronization and get results
          const result = await syncLocalDataToNotion(true);
          console.log(`[AUTO_SYNC_COMPLETE] Auto sync to Notion ${result.success ? 'successful' : 'failed'}`, result.errors || '');

          //Save synchronization results
          if (result.success && !result.errors?.length) {
            // Completely successful
            await browser.storage.local.set({
              notion_sync_status: {
                id: syncId,
                status: 'success',
                success: true,
                message: 'Automatic synchronization successful!',
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
                message: 'Partial automatic synchronization was successful, but an error occurred',
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
                message: 'Auto sync failed',
                error: result.errors ? result.errors.join('\n') : 'unknown error',
                completedTime: Date.now(),
              },
            });
          }
        } catch (error: any) {
          console.error('[AUTO_SYNC_ERROR] Error during automatic sync to Notion:', error);

          // store error information
          await browser.storage.local.set({
            notion_sync_status: {
              id: syncId,
              status: 'error',
              success: false,
              message: 'Auto sync failed',
              error: error?.message || 'An unknown error occurred during automatic synchronization',
              completedTime: Date.now(),
            },
          });
        }
      } else {
        console.log('Local data changed, but Notion sync (Local -> Notion) is disabled.');
      }
    }
  });
};
