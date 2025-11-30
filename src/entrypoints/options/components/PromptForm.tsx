import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Form, Input, Select, Switch } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface PromptFormProps {
  onSubmit: (prompt: PromptItem | Omit<PromptItem, 'id'>) => Promise<void>;
  initialData: PromptItem | null;
  onCancel: () => void;
  isEditing: boolean;
}

const PromptForm = ({ onSubmit, initialData, onCancel, isEditing }: PromptFormProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY_ID);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load category list
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const categoriesList = await getCategories();
        setCategories(categoriesList.filter((cat) => cat.enabled)); // Show only enabled categories
      } catch (err) {
        console.error(t('loadCategoriesError'), err);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Reset form when initialData changes (editing mode toggle)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setTags(initialData.tags.join(', '));
      setNotes(initialData.notes || '');
      setEnabled(initialData.enabled !== undefined ? initialData.enabled : true);
      setCategoryId(initialData.categoryId || DEFAULT_CATEGORY_ID);
    } else {
      // Clear form when not in edit mode
      setTitle('');
      setContent('');
      setTags('');
      setNotes('');
      setEnabled(true);
      setCategoryId(DEFAULT_CATEGORY_ID);
    }
    setError(null);
  }, [initialData]);

  const handleSubmit = async (e: FormEvent) => {
    // Validate form inputs
    if (!title.trim()) {
      setError(t('titleCannotBeEmpty'));
      return;
    }

    if (!content.trim()) {
      setError(t('contentCannotBeEmpty'));
      return;
    }

    if (!categoryId) {
      setError(t('pleaseSelectCategory'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Process tags: split by commas, trim whitespace, filter empty strings
      const tagList = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '');

      // Create prompt object
      const promptData = {
        ...(initialData ? { id: initialData.id } : {}),
        title: title.trim(),
        content: content.trim(),
        tags: tagList,
        notes: notes.trim(),
        enabled,
        categoryId,
        lastModified: new Date().toISOString(),
      };

      await onSubmit(promptData as any); // Type assertion to handle both new and edited prompts

      // Clear form if not in edit mode (adding new prompt)
      if (!isEditing) {
        setTitle('');
        setContent('');
        setTags('');
        setNotes('');
        setCategoryId(DEFAULT_CATEGORY_ID);
      }
    } catch (err) {
      console.error(t('formSubmitError'), err);
      setError(t('saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {error && <Alert description={error} icon={<InfoCircleOutlined />} type="error" showIcon />}

      <Form onFinish={handleSubmit} className="space-y-2 mt-1" layout="vertical">
        {/* TITLE */}
        <Form.Item label={t('titleLabel')} required>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titlePlaceholder')} />
        </Form.Item>

        {/* CONTENT */}
        <Form.Item label={t('contentLabel')} required>
          <Input.TextArea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder={t('contentPlaceholder')} />
          <Alert message={t('variableFormatTip')} description={t('variableExample')} className="mt-2" type="warning" />
        </Form.Item>

        {/* CATEGORY */}
        <Form.Item label={t('categoryLabel')} required>
          {loadingCategories ? (
            <>
              <Input value={t('loadingCategories')} disabled />
            </>
          ) : (
            <Select id="category" value={categoryId} onChange={(option) => setCategoryId(option)} className="block">
              {categories.map((category) => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          )}
          {categories.length === 0 && !loadingCategories && (
            <p className="mt-1 text-sm text-gray-500">
              {t('noAvailableCategories')}
              <Link to="/categories" className="ml-1">
                {t('createCategory')}
              </Link>
            </p>
          )}
        </Form.Item>

        {/* TAGS */}
        <Form.Item
          label={
            <>
              {t('tagsLabel')} <span className="text-gray-400 font-normal">({t('tagsOptional')})</span>
            </>
          }
        >
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('tagsPlaceholder')} />
        </Form.Item>

        {/* NOTES */}
        <Form.Item
          label={
            <>
              {t('notesLabel')} <span className="text-gray-400 font-normal">({t('notesOptional')})</span>
            </>
          }
        >
          <Input.TextArea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t('notesPlaceholder')} />
          <Alert className="mt-2 text-xs p-3" description={t('notesHelp')} type="warning" />
        </Form.Item>

        {/* ENABLED SWITCH */}
        <Form.Item>
          <Switch checked={enabled} onChange={(checked) => setEnabled(checked)} />{' '}
          <span className="ml-2 text-xs font-medium text-gray-700">
            {enabled ? t('enabledStatus') : t('disabledStatus')} <span className="text-gray-400 font-normal ml-2">({t('disabledStatusTip')})</span>
          </span>
        </Form.Item>
        {/* ACTION BUTTONS */}
        <Form.Item className="mb-0">
          <div className="flex justify-end gap-2">
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {isSubmitting ? t('savingPrompt') : isEditing ? t('updatePrompt') : t('savePromptButton')}
            </Button>
            <Button onClick={onCancel} danger>
              {t('cancel')}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default PromptForm;
