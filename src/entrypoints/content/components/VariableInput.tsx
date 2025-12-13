import { createRoot } from 'react-dom/client';
import { Form, Input, Typography, Alert, Tag, InputRef } from 'antd';
import { extractVariables, replaceVariables } from '../utils/variableParser';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { TextAreaRef } from 'antd/es/input/TextArea';

const { Title } = Typography;

interface VariableInputModalProps {
  prompt: PromptItemWithVariables;
  targetElement: EditableElement;
  onConfirm: (processedContent: string) => void;
  onCancel: () => void;
}

export const VariableInputModal: React.FC<VariableInputModalProps> = ({ prompt, targetElement, onConfirm, onCancel }) => {
  const variables = prompt._variables || extractVariables(prompt.content);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(Object.fromEntries(variables.map((v) => [v, ''])));
  const [previewContent, setPreviewContent] = useState(prompt.content);
  const firstInputRef = useRef<HTMLElement>(null);
  const inputRefs = useRef<(TextAreaRef | null)[]>([]);

  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 1000); // Focus first input
  }, []);

  // Keyboard shortcuts: Esc to cancel, Ctrl+Enter to submit, Tab for navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }
      // Don't prevent Tab - let it work naturally for focus management
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [variableValues]);

  const handleVariableChange = (variable: string, value: string) => {
    const newValues = { ...variableValues, [variable]: value };
    setVariableValues(newValues);
    setPreviewContent(replaceVariables(prompt.content, newValues));
  };

  const handleSubmit = () => {
    const processedContent = replaceVariables(prompt.content, variableValues);
    onConfirm(processedContent);
    onCancel();
  };

  const handleCancel = () => {
    onCancel();
  };

  const renderHighlightedPreview = () => {
    if (!prompt.content) return null;
    const parts = prompt.content.split(/(\{\{[^{}]+\}\})/g);
    return parts.map((part, index) => {
      const match = part.match(/^\{\{([^{}]+)\}\}$/);
      if (match) {
        const varName = match[1];
        const value = variableValues[varName] || '';
        return (
          <Tag key={index} color="orange">
            {value || `{{${varName}}}`}
          </Tag>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Auto-submit if no variables
  useEffect(() => {
    if (variables.length === 0) handleSubmit();
  }, [variables.length]);

  return (
    <Modal isOpen={true} title={t('fillVariableValues')} onClose={handleCancel} onOk={handleSubmit} okText={t('confirm')} cancelText={t('cancel')}>
      <Alert description={t('pleaseEnterVariableValues')} className="p-2" type="warning" />
      <Form className="mt-3" layout="vertical">
        {variables.map((variable: string, index: number) => (
          <Form.Item key={variable} label={variable} className="mb-3">
            <Input.TextArea
              ref={(el) => {
                if (index === 0) {
                  firstInputRef.current = el as any;
                }
                inputRefs.current[index] = el;
              }}
              value={variableValues[variable]}
              onChange={(e) => handleVariableChange(variable, e.target.value)}
              placeholder={t('enterVariableValue', [variable])}
              onKeyDown={(e) => {
                // Allow Tab to work naturally for navigation
                if (e.key === 'Tab') {
                  // Don't prevent default - let browser handle Tab navigation
                  return;
                }
                // Handle Enter without Ctrl to insert newline (default textarea behavior)
                if (e.key === 'Enter' && !e.ctrlKey) {
                  // Allow default behavior (newline in textarea)
                  return;
                }
                // Ctrl+Enter submits form
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </Form.Item>
        ))}
      </Form>
      {/* <Title level={5}>{t('preview')}</Title>
      <Alert description={renderHighlightedPreview()} className="p-2" type="warning" /> */}
    </Modal>
  );
};
