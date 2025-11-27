import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { PromptItemWithVariables, EditableElement } from '@/utils/types';
import { getPromptSelectorStyles } from '../utils/styles';
import { extractVariables, replaceVariables } from '../utils/variableParser';
import { isDarkMode } from '@/utils/tools';
import { getGlobalSetting } from '@/utils/globalSettings';
import { t } from '@/utils/i18n';

interface VariableInputProps {
  prompt: PromptItemWithVariables;
  targetElement: EditableElement;
  onCancel: () => void;
  onSubmit: (processedContent: string) => void;
  isDark?: boolean;
}

//Variable input style
const getVariableInputStyles = (): string => {
  // Reuse existing basic styles and add variables to input specific styles
  const baseStyles = getPromptSelectorStyles();
  const additionalStyles = `
    /* Reset h3 tag style */
    .qp-modal-header h3 {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: white !important;
      margin: 0 !important;
      padding: 0 !important;
      line-height: 1.5 !important;
    }

    /* Variable input form style */
    .qp-variable-form {
      display: flex !important;
      flex-direction: column !important;
      padding: 15px 20px !important;
      flex: 1 !important;
      overflow-y: auto !important;
    }
    
    .qp-variable-title {
      font-size: 16px !important;
      font-weight: 600 !important;
      margin-bottom: 12px !important;
      color: var(--qp-text-primary) !important;
    }
    
    .qp-variable-description {
      font-size: 14px !important;
      color: var(--qp-text-secondary) !important;
      margin-bottom: 16px !important;
      line-height: 1.5 !important;
    }
    
    .qp-form-group {
      display: flex !important;
      flex-direction: column !important;
      margin-bottom: 16px !important;
    }
    
    .qp-form-label {
      display: block !important;
      font-weight: 500 !important;
      margin-bottom: 6px !important;
      color: var(--qp-text-primary) !important;
      font-size: 14px !important;
    }
    
    .qp-form-input {
      width: 100% !important;
      padding: 10px 12px !important;
      border-radius: 6px !important;
      border: 1px solid var(--qp-border-color) !important;
      background-color: var(--qp-bg-primary) !important;
      color: var(--qp-text-primary) !important;
      font-size: 14px !important;
      transition: border-color 0.15s ease-in-out !important;
      box-shadow: none !important;
      outline: none !important;
      resize: vertical !important;
      overflow-y: auto !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    
    .qp-form-input::-webkit-scrollbar {
      display: none !important;
    }
    
    .qp-form-input:focus {
      border-color: var(--qp-accent) !important;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2) !important;
    }
    
    .qp-preview {
      margin-top: 20px !important;
      border-top: 1px solid var(--qp-border-color) !important;
      padding-top: 16px !important;
    }
    
    .qp-preview-title {
      font-weight: 600 !important;
      margin-bottom: 8px !important;
      color: var(--qp-text-primary) !important;
      font-size: 14px !important;
    }
    
    .qp-preview-content {
      padding: 12px !important;
      background-color: var(--qp-bg-secondary) !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      color: var(--qp-text-primary) !important;
      white-space: pre-wrap !important;
      max-height: 150px !important;
      overflow-y: auto !important;
      font-family: monospace !important;
      line-height: 1.5 !important;
    }
    
    .qp-highlighted {
      background-color: var(--qp-bg-tag) !important;
      color: var(--qp-text-tag) !important;
      padding: 0 2px !important;
      border-radius: 2px !important;
    }

    /* Dark mode specific style overrides */
    :host([data-theme="dark"]) .qp-form-input {
      background-color: var(--qp-bg-secondary) !important;
      border-color: var(--qp-border-color) !important;
    }

    :host([data-theme="dark"]) .qp-form-input:focus {
      border-color: var(--qp-accent) !important;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3) !important;
    }

    :host([data-theme="dark"]) .qp-preview-content {
      background-color: var(--qp-bg-secondary) !important;
      border: 1px solid var(--qp-border-color) !important;
    }
  `;

  return baseStyles + additionalStyles;
};

const VariableInput: React.FC<VariableInputProps> = ({ prompt, targetElement, onCancel, onSubmit, isDark = false }) => {
  // Check and extract variables
  const variables = prompt._variables || extractVariables(prompt.content);

  //The state of the variable value
  const [variableValues, setVariableValues] = useState<Record<string, string>>(Object.fromEntries(variables.map((v) => [v, ''])));

  //Preview status and global settings
  const [previewContent, setPreviewContent] = useState(prompt.content);
  const [closeOnOutsideClick, setCloseOnOutsideClick] = useState(true);
  const firstInputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  //Update variable values ​​and preview
  const handleVariableChange = (variable: string, value: string) => {
    const newValues = { ...variableValues, [variable]: value };
    setVariableValues(newValues);

    //Update preview content
    const newContent = replaceVariables(prompt.content, newValues);
    setPreviewContent(newContent);
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Replace all variables and call submit callback
    const processedContent = replaceVariables(prompt.content, variableValues);
    onSubmit(processedContent);
  };

  // When the component is mounted, focus on the first input box and load global settings
  useEffect(() => {
    setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      }
    }, 100);

    //Load global settings
    const loadGlobalSettings = async () => {
      try {
        const closeModalOnOutsideClick = await getGlobalSetting('closeModalOnOutsideClick');
        setCloseOnOutsideClick(closeModalOnOutsideClick);
      } catch (err) {
        console.warn('Failed to load global settings:', err);
        setCloseOnOutsideClick(true); // enabled by default
      }
    };

    loadGlobalSettings();
  }, []);

  // If there are no variables, submit directly
  useEffect(() => {
    if (variables.length === 0) {
      onSubmit(prompt.content);
    }
  }, [prompt.content, variables.length]);

  //Keyboard shortcut processing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent events from bubbling up
      e.stopPropagation();

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        // Submit form
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onCancel]);

  // Click on the background to close the pop-up window
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOutsideClick) {
      onCancel();
    }
  };

  // Highlight variables in preview
  const renderHighlightedPreview = () => {
    if (!prompt.content) return null;

    // Use regular expressions to find all variables and replace them with highlighted versions
    const parts = prompt.content.split(/(\{\{[^{}]+\}\})/g);

    return parts.map((part, index) => {
      // Check whether it is a variable format {{variable name}}
      const varMatch = part.match(/^\{\{([^{}]+)\}\}$/);

      if (varMatch) {
        const varName = varMatch[1];
        const value = variableValues[varName] || '';
        const displayText = value || varName;

        return (
          <span key={index} className="qp-highlighted">
            {value ? displayText : `{{${displayText}}}`}
          </span>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="qp-fixed qp-inset-0 qp-flex qp-items-center qp-justify-center qp-z-50 qp-modal-container" onClick={handleBackgroundClick} data-theme={isDark ? 'dark' : 'light'}>
      <div className="qp-flex qp-flex-col qp-modal">
        <div className="qp-modal-header">
          <div className="qp-w-full">
            <h3>{t('fillVariableValues')}</h3>
          </div>
        </div>

        <div className="qp-modal-content">
          <form ref={formRef} className="qp-variable-form" onSubmit={handleSubmit}>
            <div className="qp-variable-title">{prompt.title}</div>
            <div className="qp-variable-description">{t('pleaseEnterVariableValues')}</div>

            {variables.map((variable, index) => (
              <div key={variable} className="qp-form-group">
                <label className="qp-form-label" htmlFor={`var-${variable}`}>
                  {variable}
                </label>
                <textarea
                  ref={index === 0 ? firstInputRef : null}
                  id={`var-${variable}`}
                  className="qp-form-input"
                  value={variableValues[variable]}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                  placeholder={t('enterVariableValue', [variable])}
                  rows={1}
                />
              </div>
            ))}

            <div className="qp-preview">
              <div className="qp-preview-title">{t('preview')}</div>
              <div className="qp-preview-content">{renderHighlightedPreview()}</div>
            </div>
          </form>
        </div>

        <div className="qp-modal-footer">
          <span>{t('totalVariables', [variables.length.toString()])}</span>
          <span>
            {t('escToCancel')} · {t('ctrlEnterToConfirm')}
          </span>
        </div>
      </div>
    </div>
  );
};

//Display variable input pop-up window
export function showVariableInput(prompt: PromptItemWithVariables, targetElement: EditableElement, onConfirm: (processedContent: string) => void, onCancel: () => void): HTMLElement {
  // Remove any existing pop-ups
  const existingContainer = document.getElementById('quick-prompt-variable-input');
  if (existingContainer) {
    document.body.removeChild(existingContainer);
  }

  // Create new container and add shadow root
  const container = document.createElement('div');
  container.id = 'quick-prompt-variable-input';

  //Set container style
  container.setAttribute(
    'style',
    `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: auto;
    `,
  );

  //Create shadow DOM to isolate styles
  const shadowRoot = container.attachShadow({ mode: 'open' });

  //Create style element
  const style = document.createElement('style');
  style.textContent = getVariableInputStyles();
  shadowRoot.appendChild(style);

  //Create root container
  const rootElement = document.createElement('div');
  rootElement.id = 'quick-prompt-variable-root';
  shadowRoot.appendChild(rootElement);

  // Add to documentElement (html element), not body
  document.documentElement.appendChild(container);

  //Create a wrapper component to handle dark mode and global settings
  const ThemeWrapper = () => {
    const [isDark, setIsDark] = useState(isDarkMode());

    useEffect(() => {
      //Set initial theme
      if (shadowRoot.host) {
        shadowRoot.host.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }

      // Monitor system theme changes
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        if (shadowRoot.host) {
          shadowRoot.host.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      };

      if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', handleChange);
        return () => darkModeMediaQuery.removeEventListener('change', handleChange);
      }
    }, []);

    return (
      <VariableInput
        prompt={prompt}
        targetElement={targetElement}
        isDark={isDark}
        onCancel={() => {
          onCancel();
          root.unmount();
          if (document.documentElement.contains(container)) {
            document.documentElement.removeChild(container);
          }
        }}
        onSubmit={(processedContent) => {
          onConfirm(processedContent);
          root.unmount();
          if (document.documentElement.contains(container)) {
            document.documentElement.removeChild(container);
          }
        }}
      />
    );
  };

  // Render component
  const root = createRoot(rootElement);
  root.render(<ThemeWrapper />);

  // Return container element
  return container;
}
