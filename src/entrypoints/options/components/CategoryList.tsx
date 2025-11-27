import { DEFAULT_CATEGORY_ID } from '@/utils/constants';
import { t } from '../../../utils/i18n';
import { Button, Card, Popconfirm, Switch } from 'antd';
import { DeleteFilled, FormOutlined } from '@ant-design/icons';
import appConfig from '@/app.config';

interface CategoryListProps {
  categories: Category[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  searchTerm: string;
  allCategoriesCount: number;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  promptCounts: Record<string, number>;
}

const CategoryList = ({ categories, onEdit, onDelete, searchTerm, allCategoriesCount, onToggleEnabled, promptCounts }: CategoryListProps) => {
  // if (allCategoriesCount === 0) {
  //   return (
  //     <div className='text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600'>
  //       <svg
  //         className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-500'
  //         fill='none'
  //         viewBox='0 0 24 24'
  //         stroke='currentColor'
  //         aria-hidden='true'
  //       >
  //         <path
  //           strokeLinecap='round'
  //           strokeLinejoin='round'
  //           strokeWidth={1.5}
  //           d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
  //         />
  //       </svg>
  //       <p className='mt-4 text-lg font-medium text-gray-700 dark:text-gray-300'>{t('noCategoriesAdded')}</p>
  //       <p className='mt-2 text-gray-500 dark:text-gray-400'>{t('clickAddCategory')}</p>
  //     </div>
  //   )
  // }

  // if (categories.length === 0 && searchTerm) {
  //   return (
  //     <div className='text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg'>
  //       <svg
  //         className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-500'
  //         fill='none'
  //         viewBox='0 0 24 24'
  //         stroke='currentColor'
  //         aria-hidden='true'
  //       >
  //         <path
  //           strokeLinecap='round'
  //           strokeLinejoin='round'
  //           strokeWidth={1.5}
  //           d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
  //         />
  //       </svg>
  //       <p className='mt-4 text-lg font-medium text-gray-700 dark:text-gray-300'>{t('noMatchingCategories')}</p>
  //       <p className='mt-2 text-gray-500 dark:text-gray-400'>{t('tryOtherSearchTerms')}</p>
  //     </div>
  //   )
  // }
  const getActions = (category: Category): React.ReactNode[] => {
    const actions: React.ReactNode[] = [];

    // Toggle enabled switch
    if (onToggleEnabled) {
      actions.push(
        <label key="toggle" className="relative inline-flex items-center cursor-pointer">
          <Switch checked={category.enabled} onChange={(checked) => onToggleEnabled(category.id, checked)} />
          <span className="ml-2 text-xs text-gray-600 dark:text-gray-300">{category.enabled ? t('enabled') : t('disabled')}</span>
        </label>,
      );
    }

    // Edit button
    actions.push(
      <Button type="primary" onClick={() => onEdit(category.id)} key="edit" icon={<FormOutlined />}>
        {t('edit')}
      </Button>,
    );

    // Delete button
    if (category.id !== DEFAULT_CATEGORY_ID) {
      actions.push(
        <Popconfirm
          title={t('confirmDeleteCategory')}
          description={<p className="max-w-[300px]">{t('confirmDeleteCategoryMessage')}</p>}
          onConfirm={() => onDelete(category.id)}
          okText={t('delete')}
          cancelText={t('cancel')}
        >
          <Button type="primary" key="delete" icon={<DeleteFilled />} danger>
            {t('delete')}
          </Button>
        </Popconfirm>,
      );
    }

    return actions;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {categories.map((category) => (
        <>
          <Card
            key={category.id}
            actions={getActions(category)}
            title={
              <div className="bg-linear-to-r from-app-600/5 to-white py-2 px-4 rounded-t-lg">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">{category.name}</h3>

                  <>
                    {category && (
                      <div className="flex items-center">
                        <div className="size-4 rounded-full mr-1.5" style={{ backgroundColor: category.color || appConfig.APP.COLOR_PRIMARY }} />
                        {category.id === DEFAULT_CATEGORY_ID && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                            {t('default')}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                </div>
              </div>
            }
            styles={{
              header: {
                padding: 0,
                minHeight: 0,
              },
            }}
          >
            <Card.Meta
              title={''}
              description={
                <>
                  <p className="text-sm text-gray-600 mb-4 truncate cursor-pointer hover:text-gray-800 transition-colors duration-200">
                    {category.description ? category.description : t('noDescription')}
                  </p>

                  <div className="mb-3">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      {t('prompts', [`${promptCounts[category.id] || 0}`])}
                    </div>
                  </div>
                </>
              }
            />
          </Card>
        </>
      ))}
    </div>
  );
};

export default CategoryList;
