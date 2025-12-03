import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { Alert, Button, Card, Popconfirm, Switch, Tag } from 'antd';
import { CheckOutlined, ClockCircleOutlined, CopyOutlined, DeleteFilled, DragOutlined, FormOutlined, NotificationOutlined, PushpinFilled } from '@ant-design/icons';

interface SortablePromptCardProps {
  prompt: PromptItem;
  category?: Category;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  onTogglePinned?: (id: string, pinned: boolean) => void;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
}

const SortablePromptCard: React.FC<SortablePromptCardProps> = ({ prompt, category, onEdit, onDelete, onToggleEnabled, onTogglePinned, onCopy, copiedId }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: prompt.id,
    data: {
      type: 'prompt',
      prompt,
    },
  });

  // Format last modified time
  const formatLastModified = (lastModified?: string) => {
    if (!lastModified) return t('noModificationTime');

    try {
      const date = new Date(lastModified);
      if (isNaN(date.getTime())) {
        return t('invalidTime');
      }

      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();

      if (diffInMs < 0) {
        return date.toLocaleDateString();
      }

      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        if (diffInHours === 0) {
          const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
          return diffInMinutes <= 1 ? t('justNow') : t('minutesAgo', [diffInMinutes.toString()]);
        }
        return diffInHours === 1 ? t('oneHourAgo') : t('hoursAgo', [diffInHours.toString()]);
      } else if (diffInDays === 1) {
        return t('oneDayAgo');
      } else if (diffInDays < 7) {
        return t('daysAgo', [diffInDays.toString()]);
      } else {
        return date.toLocaleDateString();
      }
    } catch (err) {
      console.error('Format time error:', err, 'lastModified:', lastModified);
      return t('invalidTime');
    }
  };

  const actions: React.ReactNode[] = [
    <>
      {onTogglePinned && (
        <Button
          onClick={() => onTogglePinned(prompt.id, !prompt.pinned)}
          type="default"
          className={`${prompt.pinned && 'bg-amber-100 border-amber-300 text-amber-700'} transition-all duration-300`}
          title={prompt.pinned ? t('unpinPrompt') : t('pinPrompt')}
          icon={prompt.pinned ? <PushpinFilled className="rotate-135" /> : <PushpinFilled className="-rotate-45" />}
        >
          {prompt.pinned ? t('unpin') : t('pin')}
        </Button>
      )}
    </>,

    <Button
      onClick={() => onCopy(prompt.content, prompt.id)}
      type="default"
      className={`${copiedId === prompt.id && 'bg-app-100/50 text-app-700 border border-app-500'} transition-all duration-300`}
      icon={copiedId === prompt.id ? <CheckOutlined /> : <CopyOutlined />}
    >
      {copiedId === prompt.id ? t('copied') : t('copy')}
    </Button>,

    <Button onClick={() => onEdit(prompt.id)} type="primary" icon={<FormOutlined />}>
      {t('edit')}
    </Button>,
    <Popconfirm
      title={t('confirmDeletePrompt')}
      description={<p className="max-w-[300px]">{t('confirmDeletePromptMessage')}</p>}
      onConfirm={() => onDelete(prompt.id)}
      // onCancel={cancel}
      okText={t('delete')}
      cancelText={t('cancel')}
    >
      <Button icon={<DeleteFilled />} type="primary" danger>
        {t('delete')}
      </Button>
    </Popconfirm>,
  ];

  return (
    <>
      <Card
        ref={setNodeRef}
        actions={actions}
        className={`${isDragging ? 'shadow-lg scale-90 ring-2 ring-app-500 ring-opacity-50' : ''}`}
        title={
          <div className={cn(prompt.pinned ? 'from-white to-app-600/10' : 'from-app-600/10 to-white', 'bg-linear-to-l py-2 px-4 rounded-t-lg')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center flex-1 min-w-0 gap-2">
                {/* Pin icon*/}
                {prompt.pinned && <PushpinFilled className="-rotate-45 text-app-600" />}
                <h3 className="text-lg font-semibold text-gray-800 truncate">{prompt.title}</h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Classification identification */}
                {category && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: category.color || useAppConfig().APP.COLOR_PRIMARY }} />
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{category.name}</span>
                  </div>
                )}

                {/* Drag handle */}
                <Button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing" title={t('dragToReorder') || 'Drag and drop to reorder'} icon={<DragOutlined />} />
              </div>
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
              <div className="mb-3">{(prompt.tags?.length ?? 0) > 0 ? prompt.tags.map((tag) => <Tag key={tag}>#{tag}</Tag>) : <Tag>{t('noTags')}</Tag>}</div>

              <p
                className="text-sm text-gray-600 mb-4 truncate cursor-pointer hover:text-gray-800 transition-colors duration-200"
                title={`${prompt.content}\n\n${t('clickToCopy') || 'Click to copy content'}`}
                onClick={() => onCopy(prompt.content, prompt.id)}
              >
                {prompt.content}
              </p>

              {prompt.notes && prompt.notes.trim() && <Alert message={t('notes')} description={prompt.notes} type="warning" icon={<NotificationOutlined />} showIcon />}

              <div className="flex items-center justify-between text-xs mt-4">
                <div className="flex items-center space-x-2">
                  <ClockCircleOutlined />
                  <span>
                    {t('lastModified')}: {formatLastModified(prompt.lastModified)}
                  </span>
                </div>

                {/* Enabled status */}
                {onToggleEnabled && (
                  <label className="inline-flex items-center cursor-pointer gap-2">
                    <Switch checked={prompt.enabled !== undefined ? prompt.enabled : true} onChange={(checked) => onToggleEnabled(prompt.id, checked)} />
                    <span>{prompt.enabled !== undefined ? (prompt.enabled ? t('enabled') : t('disabled')) : t('enabled')}</span>
                  </label>
                )}
              </div>
            </>
          }
        />
      </Card>
    </>
  );
};

export default SortablePromptCard;
