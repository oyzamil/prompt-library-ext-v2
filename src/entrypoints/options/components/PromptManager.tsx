import { useState, useEffect, useRef } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { CloseOutlined, DownloadOutlined, InfoCircleOutlined, LinkOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import PromptForm from './PromptForm';
import PromptList from './PromptList';
import SectionHeading from './SectionHeading';
import EmptyMessage from './EmptyMessage';

const PromptManager = () => {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<PromptItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Add remote import related status
  const [isRemoteImportModalOpen, setIsRemoteImportModalOpen] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isRemoteImporting, setIsRemoteImporting] = useState(false);

  // Add category related status
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLimited, setIsLimited] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        await migratePromptsWithCategory();
        const loadedPrompts = await storage.getItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`);

        const storedPrompts = !settings.isLicensed ? loadedPrompts?.slice(0, settings.freeUserLimit) : loadedPrompts;

        const sortedPrompts = (storedPrompts || []).sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aOrder = a.sortOrder ?? 999999;
          const bOrder = b.sortOrder ?? 999999;
          return aOrder - bOrder;
        });

        setPrompts((prev) => (prev.length !== sortedPrompts.length || !prev.every((p, i) => p.id === sortedPrompts[i].id) ? sortedPrompts : prev));

        setCategories(await getCategories());

        // Calculate limit here directly
        setIsLimited(!settings.isLicensed && (sortedPrompts?.length ?? 0) >= settings.freeUserLimit);
      } catch (err) {
        console.error(t('optionsPageLoadDataError'), err);
        setError(t('loadDataFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [settings]);

  // Get query parameters from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const action = queryParams.get('action');
    const content = queryParams.get('content');

    // If it is opened from the right-click menu and has text content
    if (action === 'new' && content) {
      setInitialContent(content);
      // Open the modal with a slight delay to ensure the component is fully loaded
      setTimeout(() => {
        setIsModalOpen(true);
      }, 100);
    }
  }, []);

  // Filter prompts based on search term and selected category
  useEffect(() => {
    let filtered = prompts;

    // Filter by category first
    if (selectedCategoryId) {
      filtered = filtered.filter((prompt) => prompt.categoryId === selectedCategoryId);
    }

    // Filter by search terms
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((prompt) => {
        const titleMatch = prompt.title.toLowerCase().includes(term);
        const contentMatch = prompt.content.toLowerCase().includes(term);
        const tagMatch = prompt.tags.some((tag) => tag.toLowerCase().includes(term));
        return titleMatch || contentMatch || tagMatch;
      });
    }

    // Sort by pinned status and sort number: pinned at the front, within the same level in ascending order by sortOrder
    filtered.sort((a, b) => {
      // First sort by pinned status, pinned at the front
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // If the top status is the same, sort in ascending order by sortOrder
      const aOrder = a.sortOrder !== undefined ? a.sortOrder : 999999;
      const bOrder = b.sortOrder !== undefined ? b.sortOrder : 999999;
      return aOrder - bOrder;
    });

    setFilteredPrompts(filtered);
  }, [searchTerm, prompts, selectedCategoryId]);

  // Save prompts to storage
  const savePrompts = async (newPrompts: PromptItem[]) => {
    try {
      setIsLimited(!settings.isLicensed && (newPrompts?.length ?? 0) >= settings.freeUserLimit);

      const storedPrompts = !settings.isLicensed ? newPrompts?.slice(0, settings.freeUserLimit) : newPrompts;

      await storage.setItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`, storedPrompts);
      console.log(t('optionsPagePromptsSaved'));
      setPrompts(storedPrompts);
    } catch (err) {
      console.error(t('optionsPageSavePromptsError'), err);
      setError(t('savePromptsFailed'));
    }
  };

  // Add a new prompt
  const addPrompt = async (prompt: Omit<PromptItem, 'id'>) => {
    const newPrompt: PromptItem = {
      ...prompt,
      id: crypto.randomUUID(),
      enabled: prompt.enabled !== undefined ? prompt.enabled : true, // Make sure new prompt words are enabled by default
      lastModified: prompt.lastModified || new Date().toISOString(), // Make sure there is lastModified field
    };

    const newPrompts = [newPrompt, ...prompts];
    await savePrompts(newPrompts);
  };

  // Update an existing prompt
  const updatePrompt = async (updatedPrompt: PromptItem) => {
    const newPrompts = prompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));

    await savePrompts(newPrompts);
    setEditingPrompt(null);
  };

  // Handle form submission for both add and update operations
  const handlePromptSubmit = async (prompt: PromptItem | Omit<PromptItem, 'id'>) => {
    if ('id' in prompt && prompt?.id) {
      // It's an update operation
      await updatePrompt(prompt as PromptItem);
    } else {
      // It's an add operation
      await addPrompt(prompt);
    }

    // Clear query parameters in URL
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    closeModal();
  };

  const deletePrompt = async (promptToDelete: string) => {
    if (promptToDelete) {
      const newPrompts = prompts.filter((p) => p.id !== promptToDelete);
      await savePrompts(newPrompts);

      if (editingPrompt?.id === promptToDelete) {
        setEditingPrompt(null);
      }
    }
  };

  // Start editing a prompt
  const startEdit = (id: string) => {
    const prompt = prompts.find((p) => p.id === id);
    if (prompt) {
      setEditingPrompt(prompt);
      setIsModalOpen(true);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingPrompt(null);
    setInitialContent(null);

    // Clear query parameters in URL
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    closeModal();
  };

  // Open modal for adding a new prompt
  const openAddModal = () => {
    setEditingPrompt(null);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setInitialContent(null);
  };

  // Add function to toggle enabled state
  const togglePromptEnabled = async (id: string, enabled: boolean) => {
    const newPrompts = prompts.map((p) => (p.id === id ? { ...p, enabled } : p));
    await savePrompts(newPrompts);
  };

  // Add function to switch pinned status
  const togglePromptPinned = async (id: string, pinned: boolean) => {
    const newPrompts = prompts.map((p) => (p.id === id ? { ...p, pinned } : p));
    await savePrompts(newPrompts);
  };

  // Add drag sort processing function
  const handleReorder = async (activeId: string, overId: string) => {
    const oldIndex = prompts.findIndex((p) => p.id === activeId);
    const newIndex = prompts.findIndex((p) => p.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    // rearrange array
    const newPrompts = [...prompts];
    const [removed] = newPrompts.splice(oldIndex, 1);
    newPrompts.splice(newIndex, 0, removed);

    // Update sortOrder field
    const updatedPrompts = newPrompts.map((prompt, index) => ({
      ...prompt,
      sortOrder: index,
      lastModified: new Date().toISOString(),
    }));

    await savePrompts(updatedPrompts);
  };

  // Export prompt words
  const exportPrompts = () => {
    if (prompts.length === 0) {
      alert(t('noPromptsToExport'));
      return;
    }

    try {
      const dataStr = JSON.stringify(prompts, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prompts-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log(t('exportPromptsSuccess'));
    } catch (err) {
      console.error(t('exportPromptsError'), err);
      setError(t('exportPromptsFailed'));
    }
  };

  // Trigger file selection dialog
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Import prompt words
  const importPrompts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      const importedPrompts = JSON.parse(fileContent) as PromptItem[];

      // Verify imported data format
      if (!Array.isArray(importedPrompts)) {
        throw new Error(t('invalidFileFormat'));
      }

      // Verify the structure of each prompt word and add a default classification
      const validPrompts = importedPrompts
        .filter((prompt) => {
          return typeof prompt === 'object' && typeof prompt.id === 'string' && typeof prompt.title === 'string' && typeof prompt.content === 'string' && Array.isArray(prompt.tags);
        })
        .map((prompt) => ({
          ...prompt,
          // If there is no category field or the category field is empty, set it to the default category
          categoryId: prompt.categoryId || DEFAULT_CATEGORY_ID,
          // Make sure there is an enabled field
          enabled: prompt.enabled !== undefined ? prompt.enabled : true,
          // Add default lastModified and notes fields for imported prompt words
          lastModified: prompt.lastModified || new Date().toISOString(),
          notes: prompt.notes || '',
        }));

      if (validPrompts.length === 0) {
        throw new Error(t('noValidPromptsInFile'));
      }

      // Confirm whether existing prompt words need to be merged or overwritten
      if (prompts.length > 0) {
        const shouldImport = window.confirm(t('importPromptsConfirm', [prompts.length.toString(), validPrompts.length.toString()]));

        if (shouldImport) {
          //Create a Map of existing prompt words for easy search and update
          const promptsMap = new Map(prompts.map((p) => [p.id, p]));
          let addedCount = 0;
          let updatedCount = 0;

          validPrompts.forEach((prompt) => {
            if (promptsMap.has(prompt.id)) {
              // Get existing prompt words
              const existing = promptsMap.get(prompt.id);
              // Prompt words to be imported, merge existing prompt word attributes
              const updatedPrompt = { ...existing, ...prompt };
              // Exclude lastModified field from comparison
              if (existing && JSON.stringify((({ lastModified, ...rest }) => rest)(existing)) !== JSON.stringify((({ lastModified, ...rest }) => rest)(updatedPrompt))) {
                promptsMap.set(prompt.id, updatedPrompt);
                updatedCount++;
              }
            } else {
              // Add new prompt word
              promptsMap.set(prompt.id, {
                ...prompt,
                lastModified: prompt.lastModified || new Date().toISOString(),
                notes: prompt.notes || '',
              });
              addedCount++;
            }
          });

          // If there is no new addition or update, a prompt will be displayed.
          if (addedCount === 0 && updatedCount === 0) {
            alert(t('noNewPromptsFound'));
            return;
          }

          const newPrompts = Array.from(promptsMap.values());
          await savePrompts(newPrompts);

          // Show success message with new and updated quantities
          alert(t('importSuccessful', [(addedCount + updatedCount).toString()]));
        }
        // If the user clicks Cancel, no action is taken
      } else {
        // If there is no existing prompt word, save the imported prompt word directly.
        await savePrompts(validPrompts);
        alert(t('importSuccessful', [validPrompts.length.toString()]));
      }

      // clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(t('importPromptsError'), err);
      setError(t('importPromptsFailed', [err instanceof Error ? err.message : t('unknownError')]));

      //clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handling remote URL input changes
  const handleRemoteUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRemoteUrl(e.target.value);
  };

  // Open the remote import modal box
  const openRemoteImportModal = () => {
    setIsRemoteImportModalOpen(true);
    setRemoteUrl('');
    setError(null);
  };

  // Close the remote import modal box
  const closeRemoteImportModal = () => {
    setIsRemoteImportModalOpen(false);
    setRemoteUrl('');
    setError(null);
  };

  // Import prompt words from remote URL
  const importFromRemoteUrl = async () => {
    if (!remoteUrl.trim()) {
      setError(t('enterValidUrl'));
      return;
    }

    try {
      setIsRemoteImporting(true);
      setError(null);

      const url = remoteUrl.trim();

      // Get remote data
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Remote request failed: ${response.status} ${response.statusText}`);
      }

      const fileContent = await response.text();
      const importedPrompts = JSON.parse(fileContent) as PromptItem[];

      // Verify imported data format
      if (!Array.isArray(importedPrompts)) {
        throw new Error(t('invalidRemoteDataFormat'));
      }

      // Verify the structure of each prompt word and add a default classification
      const validPrompts = importedPrompts
        .filter((prompt) => {
          return typeof prompt === 'object' && typeof prompt.id === 'string' && typeof prompt.title === 'string' && typeof prompt.content === 'string' && Array.isArray(prompt.tags);
        })
        .map((prompt) => ({
          ...prompt,
          // If there is no category field or the category field is empty, set it to the default category
          categoryId: prompt.categoryId || DEFAULT_CATEGORY_ID,
          // Make sure there is an enabled field
          enabled: prompt.enabled !== undefined ? prompt.enabled : true,
          // Add default lastModified and notes fields for imported prompt words
          lastModified: prompt.lastModified || new Date().toISOString(),
          notes: prompt.notes || '',
        }));

      if (validPrompts.length === 0) {
        throw new Error(t('noValidPromptsInRemoteData'));
      }

      // Confirm whether you need to import
      if (prompts.length > 0) {
        const shouldImport = window.confirm(t('remoteImportPromptsConfirm', [prompts.length.toString(), validPrompts.length.toString()]));

        if (shouldImport) {
          // Create a Map of existing prompt words for easy search and update
          const promptsMap = new Map(prompts.map((p) => [p.id, p]));
          let addedCount = 0;
          let updatedCount = 0;

          validPrompts.forEach((prompt) => {
            if (promptsMap.has(prompt.id)) {
              // Get existing prompt words
              const existing = promptsMap.get(prompt.id);
              // Prompt words to be imported, merge existing prompt word attributes
              const updatedPrompt = { ...existing, ...prompt };
              // Exclude lastModified field from comparison
              if (existing && JSON.stringify((({ lastModified, ...rest }) => rest)(existing)) !== JSON.stringify((({ lastModified, ...rest }) => rest)(updatedPrompt))) {
                promptsMap.set(prompt.id, updatedPrompt);
                updatedCount++;
              }
            } else {
              // Add new prompt word
              promptsMap.set(prompt.id, {
                ...prompt,
                lastModified: prompt.lastModified || new Date().toISOString(),
                notes: prompt.notes || '',
              });
              addedCount++;
            }
          });

          if (addedCount === 0 && updatedCount === 0) {
            alert(t('noNewPromptsFound'));
            closeRemoteImportModal();
            return;
          }

          const newPrompts = Array.from(promptsMap.values());
          await savePrompts(newPrompts);

          alert(t('importSuccessful', [(addedCount + updatedCount).toString()]));
          closeRemoteImportModal();
        } else {
          // User cancels import
          closeRemoteImportModal();
        }
      } else {
        // If there is no existing prompt word, save the imported prompt word directly.
        await savePrompts(validPrompts);
        alert(t('importSuccessful', [validPrompts.length.toString()]));
        closeRemoteImportModal();
      }
    } catch (err) {
      console.error(t('remoteImportPromptsError'), err);
      setError(t('remoteImportFailed', [err instanceof Error ? err.message : t('unknownError')]));
    } finally {
      setIsRemoteImporting(false);
    }
  };

  if (isLoading) {
    return <Loader text={t('loadingDataMessage')} />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SectionHeading
          title={t('promptLibrary')}
          description={t('appDescription')}
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3" />
            </svg>
          }
          colors={['bg-app-500', 'bg-app-500']}
          stats={[
            {
              label: t('totalCount'),
              count: prompts.length.toString(),
              color: useAppConfig().APP.COLOR_PRIMARY,
            },
            {
              label: t('enabledCount'),
              count: prompts.filter((p) => p.enabled).length.toString(),
              color: '#3b82f6',
            },
            {
              label: t('currentCategoryCount'),
              count: filteredPrompts.length.toString(),
              color: '#a855f7',
              show: !!selectedCategoryId,
            },
          ]}
          searchBar={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: t('searchPrompts'),
            allowClear: true,
          }}
          select={{
            options: categories,
            selectedId: selectedCategoryId,
            onChange: setSelectedCategoryId,
            defaultOption: t('allCategories'),
          }}
          actionButtons={[
            { label: t('export'), icon: <UploadOutlined />, onClick: exportPrompts, disabled: prompts.length === 0 || isLimited },
            { label: t('localImport'), icon: <DownloadOutlined />, onClick: triggerFileInput, type: 'primary', disabled: isLimited },
            { label: t('remoteImport'), icon: <LinkOutlined />, onClick: openRemoteImportModal, type: 'primary', disabled: isLimited },
            { label: t('addNewPrompt'), icon: <PlusOutlined />, onClick: openAddModal, type: 'primary', disabled: isLimited },
          ]}
          children={isLimited && <Alert type="error" description={t('promptsLimitReachedMessage')} showIcon />}
          alert={{
            type: 'error',
            message: t('operationFailed'),
            description: error,
          }}
        />
        <input type="file" ref={fileInputRef} onChange={importPrompts} accept=".json" className="hidden" />

        {/* Prompts list*/}
        <PromptList
          prompts={filteredPrompts}
          onEdit={startEdit}
          onDelete={deletePrompt}
          onReorder={handleReorder}
          searchTerm={searchTerm}
          allPromptsCount={prompts.length}
          onToggleEnabled={togglePromptEnabled}
          onTogglePinned={togglePromptPinned}
          selectedCategoryId={selectedCategoryId}
        />

        {/* No result prompt */}
        {filteredPrompts.length === 0 && (
          <>
            {searchTerm || selectedCategoryId ? (
              <>
                <EmptyMessage
                  title={t('noMatchingPrompts')}
                  message={
                    searchTerm && selectedCategoryId
                      ? t('noMatchingPromptsInCategory', [categories.find((c) => c.id === selectedCategoryId)?.name || '', searchTerm])
                      : searchTerm
                        ? t('noMatchingPrompts')
                        : t('categoryEmpty', [categories.find((c) => c.id === selectedCategoryId)?.name || ''])
                  }
                >
                  <div className="flex-center gap-3">
                    {searchTerm && (
                      <Button onClick={() => setSearchTerm('')} icon={<CloseOutlined />} variant="outlined" danger>
                        {t('clearSearch')}
                      </Button>
                    )}
                    {selectedCategoryId && (
                      <Button
                        onClick={() => setSelectedCategoryId(null)}
                        type="primary"
                        icon={
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                          </svg>
                        }
                      >
                        {t('viewAllCategories')}
                      </Button>
                    )}
                  </div>
                </EmptyMessage>
              </>
            ) : (
              <EmptyMessage title={t('noPromptsAdded')} message={`${t('noPromptsAdded')}. ${t('createFirstPrompt')}`}>
                <Button type="primary" onClick={openAddModal}>
                  {t('createFirstPrompt')}
                </Button>
              </EmptyMessage>
            )}
          </>
        )}

        {/* Add/edit Prompt modal box */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            editingPrompt ? cancelEdit() : closeModal();
          }}
          title={editingPrompt ? t('editPrompt') : t('newPrompt')}
          footer={null}
        >
          <PromptForm
            onSubmit={handlePromptSubmit}
            initialData={
              editingPrompt
                ? {
                    ...editingPrompt,
                  }
                : initialContent
                  ? {
                      id: '',
                      title: '',
                      content: initialContent,
                      tags: [],
                      enabled: true, // Enabled by default
                      categoryId: DEFAULT_CATEGORY_ID, // Add default category ID
                    }
                  : null
            }
            onCancel={() => {
              editingPrompt ? cancelEdit() : closeModal();
            }}
            isEditing={!!editingPrompt}
          />
        </Modal>

        {/* Remote import modal box */}
        <Modal isOpen={isRemoteImportModalOpen} onClose={closeRemoteImportModal} title={t('importFromUrl')} footer={null}>
          <Form className="space-y-3" layout="vertical">
            <Alert message={t('importInstructions')} description={t('importInstructionsDetail')} icon={<InfoCircleOutlined />} type="warning" showIcon />

            <Form.Item label={t('remoteUrl')}>
              <Input id="remote-url" value={remoteUrl} onChange={handleRemoteUrlChange} placeholder="https://example.com/prompts.json" prefix={<LinkOutlined />} />
            </Form.Item>

            {error && <Alert message={t('importFailed')} description={error} icon={<InfoCircleOutlined />} type="error" showIcon />}

            <div className="flex justify-end gap-3">
              <Button type="primary" onClick={importFromRemoteUrl} disabled={isRemoteImporting || !remoteUrl.trim()} loading={isRemoteImporting}>
                {isRemoteImporting ? t('importing') : t('startImport')}
              </Button>
              <Button onClick={closeRemoteImportModal} danger>
                {t('cancel')}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default PromptManager;
