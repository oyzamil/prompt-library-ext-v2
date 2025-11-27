import { ReactNode } from 'react';

const EmptyMessage = ({ title, message, icon, children }: { title?: string | ReactNode; message?: string | ReactNode; icon?: ReactNode; children?: ReactNode }) => {
  return (
    <div>
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 shadow">
        {icon ? (
          icon
        ) : (
          <svg className="mx-auto size-20 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        )}

        {/* <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t('noPromptsAdded')}</p>
         */}

        {title && <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}

        {message && <div className="mt-2 text-gray-500 dark:text-gray-400">{message}</div>}

        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
};

export default EmptyMessage;
