import { NotionIcon } from '@/icons';
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
          icon={<NotionIcon className="size-6 text-white" />}
        />

        <NotionIntegration />
      </div>
    </div>
  );
};

export default NotionIntegrationPage;
