import React, { useState, useEffect, useRef, useCallback } from 'react';
import Toast, { ToastProps } from './Toast';

interface ToastItem extends ToastProps {
  id: string;
  error?: string;
}

// Define the type of synchronization state
interface SyncStatus {
  id: string;
  status: 'in_progress' | 'success' | 'error';
  startTime?: number;
  completedTime?: number;
  message?: string;
  error?: string;
  success?: boolean;
}

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Use ref to track processed notification IDs to avoid repeated additions
  const processedToastsRef = useRef<Set<string>>(new Set());
  // Use ref to store the current status of toasts to avoid relying on toasts to cause loops
  const toastsRef = useRef<ToastItem[]>([]);

  //When toasts status is updated, ref is updated synchronously
  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    processedToastsRef.current.delete(id);
  }, []);

  const addToast = useCallback((toast: ToastProps & { id?: string; error?: string }) => {
    const id = toast.id || `toast-${Date.now()}`;

    // Check if this toast has been added
    if (processedToastsRef.current.has(id) || toastsRef.current.some((t) => t.id === id)) {
      return;
    }

    processedToastsRef.current.add(id);
    setToasts((prevToasts) => [...prevToasts, { ...toast, id }]);
  }, []);

  // Check synchronization status and add Toast
  useEffect(() => {
    const checkSyncStatuses = async () => {
      try {
        // Get all stored status
        const result = await browser.storage.local.get(null);
        const allKeys = Object.keys(result);

        // Handle standard synchronization status
        const syncKeys = ['notion_sync_status', 'notion_from_sync_status'];
        for (const storageKey of syncKeys) {
          const syncStatus = result[storageKey] as SyncStatus;
          if (syncStatus) {
            const statusId = `${storageKey}_${syncStatus.id}`;

            // Handle success or failure status
            if (syncStatus.status === 'success' || syncStatus.status === 'error') {
              // Remove any loading state
              setToasts((prev) => prev.filter((t) => t.id !== `loading_${statusId}`));
              processedToastsRef.current.delete(`loading_${statusId}`);

              //Add success/error message
              if (!processedToastsRef.current.has(statusId)) {
                addToast({
                  id: statusId,
                  type: syncStatus.status === 'success' ? 'success' : 'error',
                  message: syncStatus.message || (syncStatus.status === 'success' ? t('syncSuccess') : t('syncFailed')),
                  error: syncStatus.error,
                  duration: syncStatus.error ? 10000 : 5000,
                });

                // Clear completed status
                await browser.storage.local.remove(storageKey);
              }
            }
            // Handle ongoing status
            else if (syncStatus.status === 'in_progress') {
              const loadingId = `loading_${statusId}`;
              if (!processedToastsRef.current.has(loadingId) && !toastsRef.current.some((t) => t.id === loadingId)) {
                let loadingMessage = t('syncing');
                if (storageKey === 'notion_sync_status') {
                  loadingMessage = t('syncingToNotion');
                } else if (storageKey === 'notion_from_sync_status') {
                  loadingMessage = t('syncingFromNotion');
                }

                addToast({
                  id: loadingId,
                  type: 'loading',
                  message: syncStatus.message || loadingMessage,
                  duration: Infinity,
                });
              }
            }
          }
        }

        // Handle temporary message status
        const tempMessageKeys = allKeys.filter((key) => key.startsWith('temp_notion_message_'));
        for (const messageKey of tempMessageKeys) {
          const messageStatus = result[messageKey] as SyncStatus;
          if (messageStatus && messageStatus.id) {
            const statusId = `temp_${messageStatus.id}`;

            //Only handle temporary messages of success or failure
            if ((messageStatus.status === 'success' || messageStatus.status === 'error') && !processedToastsRef.current.has(statusId)) {
              addToast({
                id: statusId,
                type: messageStatus.status === 'success' ? 'success' : 'error',
                message: messageStatus.message || '',
                error: messageStatus.error,
                duration: messageStatus.error ? 10000 : 5000,
              });
            }
          }
        }
      } catch (error) {
        console.error('An error occurred while checking sync status:', error);
      }
    };

    // Initial check and poll every second
    checkSyncStatuses();
    const interval = setInterval(checkSyncStatuses, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [addToast]);

  return (
    <div className="toast-container fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} duration={toast.duration} onClose={() => removeToast(toast.id)} error={toast.error} />
      ))}
    </div>
  );
};

export default ToastContainer;
