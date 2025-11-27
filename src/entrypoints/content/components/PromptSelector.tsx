import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { PromptItemWithVariables, EditableElement, Category } from '@/utils/types';
import { getPromptSelectorStyles } from '../utils/styles';
import { extractVariables } from '../utils/variableParser';
import { showVariableInput } from './VariableInput';
import { isDarkMode, getCopyShortcutText } from '@/utils/tools';
import { getCategories } from '@/utils/categoryUtils';
import { getGlobalSetting } from '@/utils/globalSettings';
import { t } from '@/utils/i18n';
import { getNewlineStrategy, setElementContentByStrategy } from '@/utils/newlineRules';
import { Input, InputRef, Select } from 'antd';

interface PromptSelectorProps {
  prompts: PromptItemWithVariables[];
  targetElement: EditableElement;
  onClose: () => void;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({ prompts, targetElement, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDark, setIsDark] = useState(isDarkMode());
  const [isKeyboardNav, setIsKeyboardNav] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, Category>>({});
  const [closeOnOutsideClick, setCloseOnOutsideClick] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<InputRef>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  //Load the category list and global settings
  useEffect(() => {
    const loadData = async () => {
      try {
        //Load the category list
        const categoriesList = await getCategories();
        const enabledCategories = categoriesList.filter((cat) => cat.enabled);
        setCategories(enabledCategories);

        //Create a classification mapping table
        const categoryMap: Record<string, Category> = {};
        categoriesList.forEach((cat) => {
          categoryMap[cat.id] = cat;
        });
        setCategoriesMap(categoryMap);

        //Load global settings
        try {
          const closeModalOnOutsideClick = await getGlobalSetting('closeModalOnOutsideClick');
          setCloseOnOutsideClick(closeModalOnOutsideClick);
        } catch (err) {
          console.warn('Failed to load global settings:', err);
          setCloseOnOutsideClick(true); // enabled by default
        }
      } catch (err) {
        console.error(t('loadCategoriesFailed'), err);
      }
    };

    loadData();
  }, []);

  // Filter the prompt list - taking into account both search terms and category filters
  const filteredPrompts = prompts
    .filter((prompt) => {
      //First filter by category
      if (selectedCategoryId && prompt.categoryId !== selectedCategoryId) {
        return false;
      }

      // Then filter by search terms
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return prompt.title.toLowerCase().includes(term) || prompt.content.toLowerCase().includes(term) || prompt.tags.some((tag) => tag.toLowerCase().includes(term));
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by pinned status and last modified time: pinned in front, within the same level in descending order by last modified time
      //First sort by the pinned status, with pinned items in front
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // If the top status is the same, sort by last modification time in descending order (newest in front)
      const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return bTime - aTime;
    });

  // Focus the search box when the component is mounted
  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    // Monitor system theme changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      if (modalRef.current) {
        modalRef.current.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };

    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleChange);
      return () => darkModeMediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  //Set initial theme
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  //Add entry animation effect
  useEffect(() => {
    const modal = modalRef.current?.querySelector('.qp-modal') as HTMLElement;
    if (modal) {
      // Set the initial state first
      modal.style.opacity = '0';
      modal.style.transform = 'translateY(10px) scale(0.99)'; // More subtle starting point for animation

      // Then add animation
      setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.transform = 'translateY(0) scale(1)';
      }, 10);
    }
  }, []);

  // Cycle through categories
  const cycleCategorySelection = (direction: 'next' | 'prev') => {
    const allOptions = [null, ...categories.map((cat) => cat.id)]; // null means "all categories"
    const currentIndex = allOptions.indexOf(selectedCategoryId);

    let nextIndex;
    if (direction === 'next') {
      nextIndex = currentIndex === allOptions.length - 1 ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex === 0 ? allOptions.length - 1 : currentIndex - 1;
    }

    setSelectedCategoryId(allOptions[nextIndex]);
  };

  //Copy the content of the prompt word
  const copyPrompt = async (e: React.MouseEvent, prompt: PromptItemWithVariables) => {
    e.stopPropagation(); // Prevent events from bubbling and avoid triggering the selection prompt word
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000); //Clear the copy status after 2 seconds
    } catch (err) {
      console.error(t('copyFailed'), err);
    }
  };

  // keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent events from bubbling and prevent the host page from receiving these keyboard events.
      e.stopPropagation();

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
          setIsKeyboardNav(true); // Set to keyboard navigation mode
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
          //Tab key cycles through categories
          cycleCategorySelection(e.shiftKey ? 'prev' : 'next');
          break;
        case 'c':
          // Ctrl+C (Windows) or Command+C (Mac) copies the currently selected prompt word
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

  //Reset the selected index when the filter results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, selectedCategoryId]);

  //Add mouse movement event listening
  useEffect(() => {
    const handleMouseMove = () => {
      setIsKeyboardNav(false); // Set to mouse navigation mode
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    return () => document.removeEventListener('mousemove', handleMouseMove, true);
  }, []);

  // Make sure the selected item is in view
  useEffect(() => {
    // Directly access Shadow DOM through modalRef
    const shadowRoot = modalRef.current?.getRootNode() as ShadowRoot;
    if (!shadowRoot) return;

    const selectedElement = shadowRoot.querySelector(`#prompt-item-${selectedIndex}`);

    if (selectedElement && listRef.current) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  //Apply the selected prompt
  const applyPrompt = (prompt: PromptItemWithVariables) => {
    //Extract the variables in the prompt word
    const variables = prompt._variables || extractVariables(prompt.content);
    prompt._variables = variables;

    // If the prompt word contains a variable, open the variable input pop-up window
    if (variables && variables.length > 0) {
      // Temporarily close the prompt selector
      onClose();

      //Display variable input pop-up window
      showVariableInput(
        prompt,
        targetElement,
        (processedContent) => {
          // After the variables are filled in, use the processed content to apply to the target element
          applyProcessedContent(processedContent);
        },
        () => {
          // When canceling variable input, no operation is performed
          console.log(t('variableInputCanceled'));
        },
      );
      return;
    }

    // If there are no variables, the original content is applied directly
    applyProcessedContent(prompt.content);
  };

  //Apply the processed content to the target element
  const applyProcessedContent = (content: string) => {
    // Check if it is a custom adapter (contenteditable element)
    const isContentEditableAdapter = !!(targetElement as any)._element && (targetElement as any)._element.getAttribute('contenteditable') === 'true';

    if (isContentEditableAdapter) {
      try {
        //Special handling of contenteditable elements
        const editableElement = (targetElement as any)._element as HTMLElement;
        const newlineStrategy = getNewlineStrategy(window.location.href);

        // Get the current content and cursor position
        const fullText = editableElement.textContent || '';

        // Check whether the full text contains "/p", case-insensitive
        if (fullText.toLowerCase().includes('/p')) {
          // Find the position of the last "/p" or "/P"
          // First search for lowercase, then uppercase, and take the last position
          const lastLowerCasePos = fullText.toLowerCase().lastIndexOf('/p');
          // Find the two characters at this position in the actual text
          const actualTrigger = fullText.substring(lastLowerCasePos, lastLowerCasePos + 2);

          // Build new content (remove trigger words and insert prompt words)
          const textBeforeTrigger = fullText.substring(0, lastLowerCasePos);
          const textAfterTrigger = fullText.substring(lastLowerCasePos + 2);
          const newContent = textBeforeTrigger + content + textAfterTrigger;

          //Create and dispatch beforeinput event
          const beforeInputEvent = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertFromPaste',
            data: newContent,
          });

          // If the beforeinput event is not blocked, continue processing
          if (editableElement.dispatchEvent(beforeInputEvent)) {
            setElementContentByStrategy(editableElement, newContent, newlineStrategy);

            //Create and dispatch input events
            const inputEvent = new InputEvent('input', {
              bubbles: true,
              inputType: 'insertFromPaste',
              data: newContent,
            });
            editableElement.dispatchEvent(inputEvent);

            //Set the cursor to the end
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              range.selectNodeContents(editableElement);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        } else {
          // If "/p" is not found, insert content at the current cursor position
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const beforeInputEvent = new InputEvent('beforeinput', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertFromPaste',
              data: content,
            });

            // If the beforeinput event is not blocked, continue processing
            if (editableElement.dispatchEvent(beforeInputEvent)) {
              const currentContent = editableElement.textContent || '';
              const position = range.startOffset;

              //Insert new content at the cursor position
              const newContent = currentContent.slice(0, position) + content + currentContent.slice(position);

              setElementContentByStrategy(editableElement, newContent, newlineStrategy);

              //Create and dispatch input events
              const inputEvent = new InputEvent('input', {
                bubbles: true,
                inputType: 'insertFromPaste',
                data: content,
              });
              editableElement.dispatchEvent(inputEvent);

              //Set the cursor to the end
              const newRange = document.createRange();
              newRange.selectNodeContents(editableElement);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } else {
            // If there is no selection, append to the end
            const beforeInputEvent = new InputEvent('beforeinput', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertFromPaste',
              data: content,
            });

            // If the beforeinput event is not blocked, continue processing
            if (editableElement.dispatchEvent(beforeInputEvent)) {
              const currentContent = editableElement.textContent || '';
              const newContent = currentContent + content;
              setElementContentByStrategy(editableElement, newContent, newlineStrategy);

              //Create and dispatch input events
              const inputEvent = new InputEvent('input', {
                bubbles: true,
                inputType: 'insertFromPaste',
                data: content,
              });
              editableElement.dispatchEvent(inputEvent);
            }
          }
        }

        // Make sure the editor has focus
        editableElement.focus();
      } catch (error) {
        console.error(t('errorProcessingContentEditable'), error);
      }
    } else {
      //Original standard input box processing logic
      const cursorPosition = targetElement.selectionStart || 0;
      const textBeforeCursor = targetElement.value.substring(0, cursorPosition - 2);
      const textAfterCursor = targetElement.value.substring(cursorPosition);
      targetElement.value = textBeforeCursor + content + textAfterCursor;

      //Set cursor position
      const newCursorPosition = textBeforeCursor.length + content.length;
      if (targetElement.setSelectionRange) {
        targetElement.setSelectionRange(newCursorPosition, newCursorPosition);
      }
      targetElement.focus();

      //Trigger input event
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

    //Close pop-up window
    onClose();
  };

  // Click on the background to close the pop-up window
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOutsideClick) {
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      className={`qp-fixed qp-inset-0 qp-flex qp-items-center qp-justify-center qp-z-50 qp-modal-container ${isKeyboardNav ? 'qp-keyboard-nav' : ''}`}
      onClick={handleBackgroundClick}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div className="qp-flex qp-flex-col qp-modal">
        <div className="qp-modal-header">
          <div className="qp-w-full qp-space-y-3">
            <div className="qp-flex qp-items-center qp-gap-3">
              <Input
                ref={searchInputRef}
                placeholder={t('searchKeywordPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
              />
              <Select value={selectedCategoryId || ''} onChange={(selected) => setSelectedCategoryId(selected || null)} className="qp-category-select">
                <Select.Option value="">{t('allCategories')}</Select.Option>
                {categories.map((category) => (
                  <Select.Option key={category.id} value={category.id}>
                    {category.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div ref={listRef} className="qp-overflow-auto qp-modal-content qp-custom-scrollbar">
          {filteredPrompts.length > 0 ? (
            <>
              {filteredPrompts.map((prompt, index) => {
                const category = categoriesMap[prompt.categoryId];
                return (
                  <div
                    id={`prompt-item-${index}`}
                    key={prompt.id}
                    className={`qp-cursor-pointer qp-prompt-item ${index === selectedIndex ? 'qp-selected' : ''}`}
                    onClick={() => applyPrompt(prompt)}
                    onMouseEnter={() => !isKeyboardNav && setSelectedIndex(index)}
                  >
                    <div className="qp-flex qp-justify-between qp-items-center">
                      <div className="qp-prompt-title">{prompt.title}</div>
                      <button className={`qp-copy-button ${copiedId === prompt.id ? 'qp-copied' : ''}`} onClick={(e) => copyPrompt(e, prompt)} title={t('copyPrompt')}>
                        {copiedId === prompt.id ? (
                          <svg className="qp-copy-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg className="qp-copy-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path d="M16 2v3a2 2 0 002 2h3M4 8v12a2 2 0 002 2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="qp-prompt-preview">{prompt.content}</div>
                    <div className="qp-prompt-meta">
                      {category && (
                        <div className="qp-prompt-category">
                          <div className="qp-category-dot" style={{ backgroundColor: category.color || '#6366f1' }} />
                          <span className="qp-category-name">{category.name}</span>
                        </div>
                      )}
                      {prompt.tags.length > 0 && (
                        <div className="qp-tags-container">
                          {prompt.tags.map((tag) => (
                            <span key={tag} className="qp-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="qp-empty-state">
              <svg className="qp-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <div className="qp-empty-text">{searchTerm || selectedCategoryId ? t('noMatchingPrompts') : t('noAvailablePrompts')}</div>
              <div className="qp-empty-subtext">
                {searchTerm && selectedCategoryId ? t('tryChangingSearchOrCategory') : searchTerm ? t('tryOtherKeywords') : selectedCategoryId ? t('noCategoryPrompts') : t('pleaseAddPrompts')}
              </div>
            </div>
          )}
        </div>

        <div className="qp-modal-footer">
          <span>{t('totalPrompts2', [filteredPrompts.length.toString()])}</span>
          <span>
            {t('pressCtrlCToCopy', [getCopyShortcutText()])} • {t('navigationHelp')}
          </span>
        </div>
      </div>
    </div>
  );
};

//Create a pop-up window and mount the component
export function showPromptSelector(prompts: PromptItemWithVariables[], targetElement: EditableElement, onCloseCallback?: () => void): HTMLElement {
  // Remove any existing pop-ups
  const existingContainer = document.getElementById('quick-prompt-selector');
  if (existingContainer) {
    document.body.removeChild(existingContainer);
  }

  // Create new container and add shadow root
  const container = document.createElement('div');
  container.id = 'quick-prompt-selector';

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
  style.textContent = getPromptSelectorStyles();
  shadowRoot.appendChild(style);

  //Create root container
  const rootElement = document.createElement('div');
  rootElement.id = 'quick-prompt-root';
  shadowRoot.appendChild(rootElement);

  // Add to documentElement (html element), not body
  document.documentElement.appendChild(container);

  //Create a custom wrapper component to handle special cases in shadow DOM environments
  const ShadowDomWrapper = (props: PromptSelectorProps) => {
    const { prompts, targetElement, onClose } = props;
    const [isDark, setIsDark] = useState(isDarkMode());

    //Set initial theme
    useEffect(() => {
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

    // Set focus to the search box when the component is mounted
    useEffect(() => {
      // Delay focus to ensure the element is mounted
      setTimeout(() => {
        const searchInput = shadowRoot.querySelector('.qp-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }, []);

    //Add keyboard event handling
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent events from bubbling and prevent the host page from receiving these keyboard events.
        e.stopPropagation();
      };

      // Use the capture phase to ensure we receive the event first
      document.addEventListener('keydown', handleKeyDown, true);

      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }, []);

    return <PromptSelector prompts={prompts} targetElement={targetElement} onClose={onClose} />;
  };

  // Render component
  const root = createRoot(rootElement);
  root.render(
    <ShadowDomWrapper
      prompts={prompts}
      targetElement={targetElement}
      onClose={() => {
        //Call the close callback
        onCloseCallback?.();
        root.unmount();
        if (document.documentElement.contains(container)) {
          document.documentElement.removeChild(container);
        }
      }}
    />,
  );

  // Return the container element for further customization
  return container;
}
