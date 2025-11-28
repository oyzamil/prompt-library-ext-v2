import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Form, Input, Typography, Alert, Tag } from 'antd';
import type { PromptItemWithVariables, EditableElement } from '@/utils/types';
import { extractVariables, replaceVariables } from '../utils/variableParser';
import { t } from '@/utils/i18n';
import { ThemeProvider } from '@/providers/ThemeProvider';

const { Title } = Typography;

interface VariableInputModalProps {
  prompt: PromptItemWithVariables;
  targetElement: EditableElement;
  onConfirm: (processedContent: string) => void;
  onCancel: () => void;
}

export function showVariableInput(prompt: PromptItemWithVariables, targetElement: EditableElement, onConfirm: (processedContent: string) => void, onCancel: () => void): HTMLElement {
  // Remove any existing modal
  const existing = document.getElementById('quick-prompt-variable-input');
  if (existing) document.body.removeChild(existing);

  const container = document.createElement('div');
  container.id = 'quick-prompt-variable-input';
  document.body.appendChild(container);

  const root = createRoot(container);

  const VariableInputModal: React.FC<VariableInputModalProps> = ({ prompt, targetElement, onConfirm, onCancel }) => {
    const variables = prompt._variables || extractVariables(prompt.content);
    const [variableValues, setVariableValues] = useState<Record<string, string>>(Object.fromEntries(variables.map((v) => [v, ''])));
    const [previewContent, setPreviewContent] = useState(prompt.content);
    const firstInputRef = useRef<HTMLElement>(null);

    // Focus first input
    useEffect(() => {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }, []);

    // Keyboard shortcuts: Esc to cancel, Ctrl+Enter to submit
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
      };
      document.addEventListener('keydown', handleKey, true);
      return () => document.removeEventListener('keydown', handleKey, true);
    }, [variableValues]);

    const handleVariableChange = (variable: string, value: string) => {
      const newValues = { ...variableValues, [variable]: value };
      setVariableValues(newValues);
      setPreviewContent(replaceVariables(prompt.content, newValues));
    };

    const handleSubmit = () => {
      const processedContent = replaceVariables(prompt.content, variableValues);
      onConfirm(processedContent);
      cleanup();
    };

    const handleCancel = () => {
      onCancel();
      cleanup();
    };

    const cleanup = () => {
      root.unmount();
      if (document.body.contains(container)) document.body.removeChild(container);
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
      <Modal isOpen={true} title={t('fillVariableValues')} onClose={handleCancel} onOk={handleSubmit} okText={t('confirm')} cancelText={t('cancel')} maskClosable={true}>
        <Alert description={t('pleaseEnterVariableValues')} className="p-2" type="warning" />
        <Form className="mt-3">
          {variables.map((variable: string, index: number) => (
            <Form.Item vertical key={variable} label={variable} className="mb-3">
              <Input.TextArea
                ref={index === 0 ? firstInputRef : null}
                value={variableValues[variable]}
                onChange={(e) => handleVariableChange(variable, e.target.value)}
                placeholder={t('enterVariableValue', [variable])}
              />
            </Form.Item>
          ))}
        </Form>
        <Title level={5}>{t('preview')}</Title>
        <Alert description={renderHighlightedPreview()} className="p-2" type="warning" />
      </Modal>
    );
  };

  root.render(
    <ThemeProvider>
      <VariableInputModal prompt={prompt} targetElement={targetElement} onConfirm={onConfirm} onCancel={onCancel} />
    </ThemeProvider>,
  );

  return container;
}
