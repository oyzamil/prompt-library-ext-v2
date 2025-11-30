import NotionIntegration from './NotionIntegration';
import SectionHeading from './SectionHeading';

const NotionIntegrationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading
          title={t('notionIntegration')}
          description={t('notionIntegrationDescription')}
          colors={['from-green-500', 'to-emerald-600']}
          icon={
            <svg className="size-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />

        <NotionIntegration />
      </div>
    </div>
  );
};

export default NotionIntegrationPage;
