import React, { useState, useEffect, useRef } from 'react';
import type { PromptItemWithVariables, EditableElement, Category } from '@/utils/types';
import { extractVariables } from '../utils/variableParser';
import { showVariableInput } from './VariableInput';
import { getCopyShortcutText } from '@/utils/tools';
import { getCategories } from '@/utils/categoryUtils';
import { getGlobalSetting } from '@/utils/globalSettings';
import { t } from '@/utils/i18n';
import { getNewlineStrategy, setElementContentByStrategy } from '@/utils/newlineRules';
import { Button, Card, Input, InputRef, Select, Space, Tag } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useAntd } from '@/providers/ThemeProvider';

interface PromptSelectorProps {
  prompts: PromptItemWithVariables[];
  targetElement: EditableElement;
  onClose: () => void;
}

export const PromptSelector: React.FC<PromptSelectorProps> = ({ prompts, targetElement, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, Category>>({});
  const [closeOnOutsideClick, setCloseOnOutsideClick] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<InputRef>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { theme } = useAntd();

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoriesList = await getCategories();
        const enabledCategories = categoriesList.filter((cat) => cat.enabled);
        setCategories(enabledCategories);

        const categoryMap: Record<string, Category> = {};
        categoriesList.forEach((cat) => {
          categoryMap[cat.id] = cat;
        });
        setCategoriesMap(categoryMap);

        try {
          const closeModalOnOutsideClick = await getGlobalSetting('closeModalOnOutsideClick');
          setCloseOnOutsideClick(closeModalOnOutsideClick);
        } catch (err) {
          console.warn('Failed to load global settings:', err);
          setCloseOnOutsideClick(true);
        }
      } catch (err) {
        console.error(t('loadCategoriesFailed'), err);
      }
    };

    loadData();
  }, []);

  const filteredPrompts = prompts
    .filter((prompt) => {
      if (selectedCategoryId && prompt.categoryId !== selectedCategoryId) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return prompt.title.toLowerCase().includes(term) || prompt.content.toLowerCase().includes(term) || prompt.tags.some((tag) => tag.toLowerCase().includes(term));
      }

      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return bTime - aTime;
    });

  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  const cycleCategorySelection = (direction: 'next' | 'prev') => {
    const allOptions = [null, ...categories.map((cat) => cat.id)];
    const currentIndex = allOptions.indexOf(selectedCategoryId);

    let nextIndex;
    if (direction === 'next') {
      nextIndex = currentIndex === allOptions.length - 1 ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex === 0 ? allOptions.length - 1 : currentIndex - 1;
    }

    setSelectedCategoryId(allOptions[nextIndex]);
  };

  const copyPrompt = async (e: React.MouseEvent, prompt: PromptItemWithVariables) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error(t('copyFailed'), err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
          setIsKeyboardNav(true);
          e.preventDefault();
          setSelectedIndex((prev) => (e.key === 'ArrowDown' ? (prev === filteredPrompts.length - 1 ? 0 : prev + 1) : prev === 0 ? filteredPrompts.length - 1 : prev - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredPrompts[selectedIndex]) {
            applyPrompt(filteredPrompts[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          cycleCategorySelection(e.shiftKey ? 'prev' : 'next');
          break;
        case 'c':
          if ((e.ctrlKey || e.metaKey) && filteredPrompts[selectedIndex]) {
            e.preventDefault();
            navigator.clipboard
              .writeText(filteredPrompts[selectedIndex].content)
              .then(() => {
                setCopiedId(filteredPrompts[selectedIndex].id);
                setTimeout(() => setCopiedId(null), 2000);
              })
              .catch((err) => console.error(t('copyFailed'), err));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedIndex, filteredPrompts, categories, selectedCategoryId]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, selectedCategoryId]);

  useEffect(() => {
    const handleMouseMove = () => {
      setIsKeyboardNav(false);
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    return () => document.removeEventListener('mousemove', handleMouseMove, true);
  }, []);

  useEffect(() => {
    const selectedElement = document.querySelector(`#prompt-item-${selectedIndex}`);
    if (selectedElement && listRef.current) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const applyPrompt = (prompt: PromptItemWithVariables) => {
    const variables = prompt._variables || extractVariables(prompt.content);
    prompt._variables = variables;

    if (variables && variables.length > 0) {
      onClose();
      showVariableInput(
        prompt,
        targetElement,
        (processedContent) => {
          applyProcessedContent(processedContent);
        },
        () => {
          console.log(t('variableInputCanceled'));
        },
      );
      return;
    }

    applyProcessedContent(prompt.content);
  };

  const applyProcessedContent = (content: string) => {
    const isContentEditableAdapter = !!(targetElement as any)._element && (targetElement as any)._element.getAttribute('contenteditable') === 'true';

    if (isContentEditableAdapter) {
      try {
        const editableElement = (targetElement as any)._element as HTMLElement;
        const newlineStrategy = getNewlineStrategy(window.location.href);
        const fullText = editableElement.textContent || '';

        if (fullText.toLowerCase().includes('/p')) {
          const lastLowerCasePos = fullText.toLowerCase().lastIndexOf('/p');
          const textBeforeTrigger = fullText.substring(0, lastLowerCasePos);
          const textAfterTrigger = fullText.substring(lastLowerCasePos + 2);
          const newContent = textBeforeTrigger + content + textAfterTrigger;

          const beforeInputEvent = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertFromPaste',
            data: newContent,
          });

          if (editableElement.dispatchEvent(beforeInputEvent)) {
            setElementContentByStrategy(editableElement, newContent, newlineStrategy);

            const inputEvent = new InputEvent('input', {
              bubbles: true,
              inputType: 'insertFromPaste',
              data: newContent,
            });
            editableElement.dispatchEvent(inputEvent);

            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              range.selectNodeContents(editableElement);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
        editableElement.focus();
      } catch (error) {
        console.error(t('errorProcessingContentEditable'), error);
      }
    } else {
      const cursorPosition = targetElement.selectionStart || 0;
      const textBeforeCursor = targetElement.value.substring(0, cursorPosition - 2);
      const textAfterCursor = targetElement.value.substring(cursorPosition);
      targetElement.value = textBeforeCursor + content + textAfterCursor;

      const newCursorPosition = textBeforeCursor.length + content.length;
      if (targetElement.setSelectionRange) {
        targetElement.setSelectionRange(newCursorPosition, newCursorPosition);
      }
      targetElement.focus();

      try {
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          inputType: 'insertFromPaste',
          data: content,
        });
        targetElement.dispatchEvent(inputEvent);
      } catch (error) {
        console.warn(t('cannotTriggerInputEvent'), error);
      }
    }

    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={closeOnOutsideClick ? onClose : undefined}
      maskClosable={closeOnOutsideClick}
      className={cn(isKeyboardNav && 'keyboard-nav', 'min-w-[700px] w-[80%]')}
      styles={{
        content: {
          padding: 0,
          overflow: 'hidden',
        },
        footer: {
          padding: '0 1rem 1rem',
        },
      }}
      closable={false}
      footer={null}
      noTitle
    >
      {/* Header  */}
      <div className="flex gap-3 p-4 bg-app-500">
        <Input ref={searchInputRef} placeholder={t('searchKeywordPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} allowClear />
        <Select value={selectedCategoryId || ''} onChange={(category) => setSelectedCategoryId(category || null)}>
          <Select.Option value="">{t('allCategories')}</Select.Option>
          {categories.map((category) => (
            <Select.Option key={category.id} value={category.id}>
              {category.name}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div ref={listRef} className="flex flex-col max-h-[350px] overflow-y-scroll">
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map((prompt, index) => {
            const category = categoriesMap[prompt.categoryId];
            return (
              <div
                id={`prompt-item-${index}`}
                key={prompt.id}
                className={cn(
                  index === selectedIndex && 'selected-item',
                  'flex flex-col p-4 space-y-2 border-b border-gray-200 hover:bg-app-500/10 hover:border-l-4 hover:border-l-app-500 transition-all',
                )}
                onClick={() => applyPrompt(prompt)}
                onMouseEnter={() => !isKeyboardNav && setSelectedIndex(index)}
              >
                <div className="flex auto gap-2.5">
                  <div className="space-y-2 w-full">
                    <div className="title font-bold">{prompt.title}</div>

                    <div className="content line-clamp-1">{prompt.content}</div>
                  </div>

                  <Button icon={<CopyOutlined />} title="Copy" className="flex-none" onClick={(e) => copyPrompt(e, prompt)} />
                </div>

                <div className="meta">
                  {category && (
                    <Tag>
                      <span className="size-2 inline-block rounded-full mr-1" style={{ backgroundColor: category.color || useAppConfig().APP.COLOR_PRIMARY }}></span>
                      <span>{category.name}</span>
                    </Tag>
                  )}

                  {prompt.tags.map((tag, tagIndex) => (
                    <Tag key={tagIndex}>{tag}</Tag>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">{searchTerm || selectedCategoryId ? t('noMatchingPrompts') : t('noAvailablePrompts')}</p>
            <p className="text-sm">
              {searchTerm && selectedCategoryId ? t('tryChangingSearchOrCategory') : searchTerm ? t('tryOtherKeywords') : selectedCategoryId ? t('noCategoryPrompts') : t('pleaseAddPrompts')}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs p-2 bg-gray-100">
        <span>
          {t('total')} {filteredPrompts.length} {t('prompts')}
        </span>
        <span className="text-xs">
          {t('pressCtrlCToCopy', [getCopyShortcutText()])} • {t('navigationHelp')}
        </span>
      </div>
    </Modal>
  );
};
