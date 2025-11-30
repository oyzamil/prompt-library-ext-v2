import { Alert, Button, Form, Input, Switch } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface CategoryFormProps {
  onSubmit: (category: Category | Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData: Category | null;
  onCancel: () => void;
  isEditing: boolean;
}

const appColor = useAppConfig().APP.COLOR_PRIMARY;
const CategoryForm = ({ onSubmit, initialData, onCancel, isEditing }: CategoryFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(appColor);
  const [enabled, setEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preset color options
  const colorOptions = [
    { name: t('blue'), value: appColor },
    { name: t('green'), value: '#10b981' },
    { name: t('yellow'), value: '#f59e0b' },
    { name: t('red'), value: '#ef4444' },
    { name: t('purple'), value: '#8b5cf6' },
    { name: t('pink'), value: '#ec4899' },
    { name: t('cyan'), value: '#06b6d4' },
    { name: t('orange'), value: '#f97316' },
  ];

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setColor(initialData.color || appColor);
      setEnabled(initialData.enabled);
    } else {
      setName('');
      setDescription('');
      setColor(appColor);
      setEnabled(true);
    }
    setError(null);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form inputs
    if (!name.trim()) {
      setError(t('categoryNameCannotBeEmpty'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const categoryData = {
        ...(initialData ? { id: initialData.id, createdAt: initialData.createdAt } : {}),
        name: name.trim(),
        description: description.trim(),
        color,
        enabled,
      };

      await onSubmit(categoryData as any);

      // Clear form if not in edit mode
      if (!isEditing) {
        setName('');
        setDescription('');
        setColor(appColor);
        setEnabled(true);
      }
    } catch (err) {
      console.error('Error submitting category form:', err);
      setError(t('saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {error && <Alert description={error} icon={<InfoCircleOutlined />} type="error" showIcon />}

      <Form onFinish={handleSubmit} className="space-y-3" layout="vertical">
        <Form.Item label={t('categoryName')} required>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('categoryExample')} />
        </Form.Item>

        <Form.Item label={t('description')}>
          <Input.TextArea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t('descriptionExample')} />
        </Form.Item>

        <Form.Item label={t('categoryColor')}>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => setColor(option.value)}
                className={`w-8 h-8 rounded-full cursor-pointer ring-1 ring-gray-300 dark:ring-gray-600 hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 dark:hover:ring-gray-500 relative flex items-center justify-center transition-all duration-200`}
                style={{ backgroundColor: option.value }}
                title={option.name}
              >
                <div
                  className={`absolute -inset-0.5 rounded-full transition-all duration-200 ease-in-out ${
                    color === option.value ? 'ring-2 ring-offset-1 ring-app-500 dark:ring-app-400 opacity-100' : 'ring-0 ring-offset-0 ring-transparent opacity-0'
                  }`}
                ></div>

                <svg
                  className={`w-5 h-5 text-white pointer-events-none transition-all duration-200 ease-in-out transform ${color === option.value ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ))}
          </div>
        </Form.Item>

        <Form.Item className="mt-4 flex">
          <label className="relative flex items-center cursor-pointer">
            <Switch checked={enabled} onChange={(checked) => setEnabled(checked)} />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{enabled ? t('enabled') : t('disabled')}</span>
          </label>
          <span className="text-gray-400 dark:text-gray-500 font-normal">({t('disabledTips')})</span>
        </Form.Item>

        <div className="flex justify-end gap-3">
          <Button type="primary" htmlType="submit" disabled={isSubmitting}>
            {isSubmitting ? t('saving') : isEditing ? t('updateCategory') : t('saveCategory')}
          </Button>

          <Button onClick={onCancel} danger>
            {t('cancel')}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default CategoryForm;
