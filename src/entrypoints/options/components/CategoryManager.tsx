import CategoryForm from './CategoryForm';
import CategoryList from './CategoryList';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { getCategories, addCategory, updateCategory, deleteCategory, getPromptCountByCategory } from '@/utils/categoryUtils';
import { DEFAULT_CATEGORY_ID } from '@/utils/constants';
import { t } from '@/utils/i18n';
import SectionHeading from './SectionHeading';
import { CloseOutlined, DownloadOutlined, InfoCircleOutlined, LinkOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import appConfig from '@/app.config';
import { Alert, Button, Input } from 'antd';
import EmptyMessage from './EmptyMessage';

const CategoryManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promptCounts, setPromptCounts] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Add remote import related status
  const [isRemoteImportModalOpen, setIsRemoteImportModalOpen] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isRemoteImporting, setIsRemoteImporting] = useState(false);

  // Load categories from storage
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        const storedCategories = await getCategories();
        setCategories(storedCategories);
        console.log(t('categoryPageLoadCategories'), storedCategories.length);

        // Load the number of prompt words under each category
        const counts: Record<string, number> = {};
        for (const category of storedCategories) {
          counts[category.id] = await getPromptCountByCategory(category.id);
        }
        setPromptCounts(counts);
      } catch (err) {
        console.error(t('categoryPageLoadError'), err);
        setError(t('loadCategoriesFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Filter categories based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = categories.filter((category) => {
      const nameMatch = category.name.toLowerCase().includes(term);
      const descriptionMatch = category.description?.toLowerCase().includes(term);
      return nameMatch || descriptionMatch;
    });

    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

  // Add a new category
  const handleAddCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCategory = await addCategory(categoryData);
      const updatedCategories = [newCategory, ...categories];
      setCategories(updatedCategories);
      setPromptCounts((prev) => ({ ...prev, [newCategory.id]: 0 }));
      closeModal();
    } catch (err) {
      console.error(t('categoryPageAddError'), err);
      setError(t('addCategoryFailed'));
    }
  };

  // Update an existing category
  const handleUpdateCategory = async (updatedCategory: Category) => {
    try {
      await updateCategory(updatedCategory.id, {
        name: updatedCategory.name,
        description: updatedCategory.description,
        color: updatedCategory.color,
        enabled: updatedCategory.enabled,
      });
      const updatedCategories = categories.map((c) => (c.id === updatedCategory.id ? updatedCategory : c));
      setCategories(updatedCategories);
      setEditingCategory(null);
      closeModal();
    } catch (err) {
      console.error(t('categoryPageUpdateError'), err);
      setError(t('updateCategoryFailed'));
    }
  };

  // Handle form submission for both add and update operations
  const handleCategorySubmit = async (category: Category | Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    if ('id' in category && category?.id) {
      await handleUpdateCategory(category as Category);
    } else {
      await handleAddCategory(category);
    }
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    if (categoryToDelete) {
      try {
        await deleteCategory(categoryToDelete);
        const newCategories = categories.filter((c) => c.id !== categoryToDelete);
        setCategories(newCategories);
        if (editingCategory?.id === categoryToDelete) {
          setEditingCategory(null);
        }
        const newPromptCounts = { ...promptCounts };
        delete newPromptCounts[categoryToDelete];
        setPromptCounts(newPromptCounts);
      } catch (err) {
        console.error(t('categoryPageDeleteError'), err);
        setError(t('deleteCategoryFailed'));
      }
    }
  };

  // Start editing a category
  const startEdit = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (category) {
      setEditingCategory(category);
      setIsModalOpen(true);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCategory(null);
    closeModal();
  };

  // Open modal for adding a new category
  const openAddModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setError(null); // Clear error when closing modal
  };

  // Toggle classification enabled status
  const toggleCategoryEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateCategory(id, { enabled });
      const newCategories = categories.map((c) => (c.id === id ? { ...c, enabled } : c));
      setCategories(newCategories);
    } catch (err) {
      console.error(t('categoryPageToggleError'), err);
      setError(t('toggleCategoryStatusFailed'));
    }
  };

  // Export classification
  const exportCategories = () => {
    if (categories.length === 0) {
      alert(t('noCategoriesToExport'));
      return;
    }

    try {
      const dataStr = JSON.stringify(categories, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `categories-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log(t('exportCategoriesSuccess'));
    } catch (err) {
      console.error(t('exportCategoriesError'), err);
      setError(t('exportCategoriesFailed'));
    }
  };

  // Trigger file selection dialog
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Import categories
  const importCategories = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      const importedCategories = JSON.parse(fileContent) as Category[];

      // Verify imported data format
      if (!Array.isArray(importedCategories)) {
        throw new Error(t('invalidCategoryFileFormat'));
      }

      // Verify the structure of each category
      const validCategories = importedCategories
        .filter((category) => {
          return (
            typeof category === 'object' &&
            typeof category.id === 'string' &&
            typeof category.name === 'string' &&
            typeof category.enabled === 'boolean' &&
            typeof category.createdAt === 'string' &&
            typeof category.updatedAt === 'string'
          );
        })
        .map((category) => ({
          ...category,
          // Make sure there are description and color fields
          description: category.description || '',
          color: category.color || '#6366f1',
        }));

      if (validCategories.length === 0) {
        throw new Error(t('noValidCategoriesInFile'));
      }

      // Confirm whether existing classifications need to be merged or overwritten
      if (categories.length > 0) {
        const shouldImport = window.confirm(t('importCategoriesConfirm', [categories.length.toString(), validCategories.length.toString()]));

        if (shouldImport) {
          // Create a map of existing categories for easy search and update
          const categoriesMap = new Map(categories.map((c) => [c.id, c]));
          let addedCount = 0;
          let updatedCount = 0;

          validCategories.forEach((category) => {
            if (categoriesMap.has(category.id)) {
              // Get existing categories
              const existing = categoriesMap.get(category.id);
              // Classification to be imported, merge existing classification attributes
              const updatedCategory = { ...existing, ...category };
              // Exclude updatedAt field from comparison
              if (existing && JSON.stringify((({ updatedAt, ...rest }) => rest)(existing)) !== JSON.stringify((({ updatedAt, ...rest }) => rest)(updatedCategory))) {
                categoriesMap.set(category.id, {
                  ...updatedCategory,
                  updatedAt: new Date().toISOString(),
                });
                updatedCount++;
              }
            } else {
              // Add new category
              categoriesMap.set(category.id, {
                ...category,
                createdAt: category.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              addedCount++;
            }
          });

          // If there is no new addition or update, a prompt will be displayed.
          if (addedCount === 0 && updatedCount === 0) {
            alert(t('noNewCategoriesFound'));
            return;
          }

          const newCategories = Array.from(categoriesMap.values());
          setCategories(newCategories);

          // Number of reload prompt words
          const counts: Record<string, number> = {};
          for (const category of newCategories) {
            counts[category.id] = await getPromptCountByCategory(category.id);
          }
          setPromptCounts(counts);

          // Show success message with new and updated quantities
          alert(t('importSuccessful', [(addedCount + updatedCount).toString()]));
        }
        // If the user clicks Cancel, no action is taken
      } else {
        // If there is no existing category, save the imported category directly.
        setCategories(validCategories);

        // Number of reload prompt words
        const counts: Record<string, number> = {};
        for (const category of validCategories) {
          counts[category.id] = await getPromptCountByCategory(category.id);
        }
        setPromptCounts(counts);

        alert(t('importSuccessful', [validCategories.length.toString()]));
      }

      // clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(t('importCategoriesError'), err);
      setError(t('importCategoriesFailed', [err instanceof Error ? err.message : t('unknownError')]));

      // clear file input
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

  // Import categories from remote URL
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
      const importedCategories = JSON.parse(fileContent) as Category[];

      // Verify imported data format
      if (!Array.isArray(importedCategories)) {
        throw new Error(t('invalidRemoteCategoryDataFormat'));
      }

      // Verify the structure of each category
      const validCategories = importedCategories
        .filter((category) => {
          return (
            typeof category === 'object' &&
            typeof category.id === 'string' &&
            typeof category.name === 'string' &&
            typeof category.enabled === 'boolean' &&
            typeof category.createdAt === 'string' &&
            typeof category.updatedAt === 'string'
          );
        })
        .map((category) => ({
          ...category,
          // Make sure there are description and color fields
          description: category.description || '',
          color: category.color || '#6366f1',
        }));

      if (validCategories.length === 0) {
        throw new Error(t('noValidCategoriesInRemoteData'));
      }

      // Confirm whether you need to import
      if (categories.length > 0) {
        const shouldImport = window.confirm(t('remoteImportCategoriesConfirm', [categories.length.toString(), validCategories.length.toString()]));

        if (shouldImport) {
          // Create a map of existing categories for easy search and update
          const categoriesMap = new Map(categories.map((c) => [c.id, c]));
          let addedCount = 0;
          let updatedCount = 0;

          validCategories.forEach((category) => {
            if (categoriesMap.has(category.id)) {
              // Get existing categories
              const existing = categoriesMap.get(category.id);
              // Classification to be imported, merge existing classification attributes
              const updatedCategory = { ...existing, ...category };
              // Exclude updatedAt field from comparison
              if (existing && JSON.stringify((({ updatedAt, ...rest }) => rest)(existing)) !== JSON.stringify((({ updatedAt, ...rest }) => rest)(updatedCategory))) {
                categoriesMap.set(category.id, {
                  ...updatedCategory,
                  updatedAt: new Date().toISOString(),
                });
                updatedCount++;
              }
            } else {
              // Add new category
              categoriesMap.set(category.id, {
                ...category,
                createdAt: category.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              addedCount++;
            }
          });

          if (addedCount === 0 && updatedCount === 0) {
            alert(t('noNewCategoriesFound'));
            closeRemoteImportModal();
            return;
          }

          const newCategories = Array.from(categoriesMap.values());
          setCategories(newCategories);

          // Number of reload prompt words
          const counts: Record<string, number> = {};
          for (const category of newCategories) {
            counts[category.id] = await getPromptCountByCategory(category.id);
          }
          setPromptCounts(counts);

          alert(t('importSuccessful', [(addedCount + updatedCount).toString()]));
          closeRemoteImportModal();
        } else {
          // User cancels import
          closeRemoteImportModal();
        }
      } else {
        // If there is no existing category, save the imported category directly.
        setCategories(validCategories);

        // Number of reload prompt words
        const counts: Record<string, number> = {};
        for (const category of validCategories) {
          counts[category.id] = await getPromptCountByCategory(category.id);
        }
        setPromptCounts(counts);

        alert(t('importSuccessful', [validCategories.length.toString()]));
        closeRemoteImportModal();
      }
    } catch (err) {
      console.error(t('remoteImportCategoriesError'), err);
      setError(t('remoteImportCategoriesFailed', [err instanceof Error ? err.message : t('unknownError')]));
    } finally {
      setIsRemoteImporting(false);
    }
  };

  // Theme switching logic
  useEffect(() => {
    const updateTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    };

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      updateTheme(true);
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      updateTheme(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  if (isLoading) {
    return <Loader text={t('loadingMessage')} />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header*/}
        <SectionHeading
          title={t('categoryManagement')}
          description={t('categoryManagementDescription')}
          colors={['from-purple-500', 'to-pink-600']}
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          stats={[
            {
              label: t('totalCategories'),
              count: categories.length.toString(),
              color: appConfig.APP.COLOR_PRIMARY,
            },
            {
              label: t('enabledCount'),
              count: categories.filter((c) => c.enabled).length.toString(),
              color: '#3b82f6',
            },
            {
              label: t('totalPrompts'),
              count: Object.values(promptCounts).reduce((a, b) => a + b, 0),
              color: '#a855f7',
              show: true,
            },
          ]}
          searchBar={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: t('searchCategory'),
            allowClear: true,
          }}
          actionButtons={[
            { label: categories.length === 0 ? t('noCategoriesToExport') : t('exportAllCategories'), icon: <UploadOutlined />, onClick: exportCategories, disabled: categories.length === 0 },
            { label: t('localImportCategories'), icon: <DownloadOutlined />, onClick: triggerFileInput, type: 'primary' },
            { label: t('remoteImportCategories'), icon: <LinkOutlined />, onClick: openRemoteImportModal, type: 'primary' },
            { label: t('addCategory'), icon: <PlusOutlined />, onClick: openAddModal, type: 'primary' },
          ]}
        />

        {/* Error message */}
        {error && (
          <Alert
            message={t('operationFailed')}
            description={error}
            icon={<InfoCircleOutlined className="text-lg" />}
            className="p-3 mb-4"
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Category list */}
        <CategoryList
          categories={filteredCategories}
          onEdit={startEdit}
          onDelete={handleDeleteCategory}
          searchTerm={searchTerm}
          allCategoriesCount={categories.length}
          onToggleEnabled={toggleCategoryEnabled}
          promptCounts={promptCounts}
        />

        <input type="file" ref={fileInputRef} onChange={importCategories} accept=".json" className="hidden" />

        {/* No result prompt */}
        {filteredCategories.length === 0 && (
          <>
            {searchTerm ? (
              <EmptyMessage title={t('noMatchingCategories2')} message={`${t('noMatchingCategories', [`${searchTerm}`])}`}>
                <Button onClick={() => setSearchTerm('')} icon={<CloseOutlined />} danger>
                  {t('clearSearch')}
                </Button>
              </EmptyMessage>
            ) : (
              <EmptyMessage title={t('noCategories')} message={t('createFirstCategory')}>
                <Button type="primary" onClick={openAddModal} icon={<PlusOutlined />}>
                  {t('createFirstCategory')}
                </Button>
              </EmptyMessage>
            )}
          </>
        )}

        {/* Add/edit category modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingCategory ? t('editCategory') : t('addCategory')} // Title as string
        >
          <CategoryForm onSubmit={handleCategorySubmit} initialData={editingCategory} onCancel={cancelEdit} isEditing={!!editingCategory} />
        </Modal>

        {/* Remote import modal box */}
        <Modal isOpen={isRemoteImportModalOpen} onClose={closeRemoteImportModal} title={t('importCategoriesFromUrl')}>
          <div className="space-y-4">
            <Alert message={t('importInstructions')} description={t('importCategoriesInstructionsDetail')} icon={<InfoCircleOutlined className="text-lg" />} className="p-3" type="warning" showIcon />

            <div>
              <label htmlFor="remote-url">{t('remoteUrl')}</label>
              <Input id="remote-url" value={remoteUrl} onChange={handleRemoteUrlChange} placeholder="https://example.com/prompts.json" prefix={<LinkOutlined />} />
            </div>

            {error && <Alert message={t('importFailed')} description={error} icon={<InfoCircleOutlined className="text-lg" />} className="p-3" type="error" showIcon />}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="primary" onClick={importFromRemoteUrl} disabled={isRemoteImporting || !remoteUrl.trim()} loading={isRemoteImporting}>
                {isRemoteImporting ? t('importing') : t('startImport')}
              </Button>
              <Button onClick={closeRemoteImportModal} danger>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default CategoryManager;
