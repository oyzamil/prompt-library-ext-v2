import { extractVariables } from '../utils/variableParser';
import { VariableInputModal } from './VariableInput';
import { Button, Input, InputRef, Select, Tag } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { createAndMountUI, useAntd } from '@/providers/ThemeProvider';
import { ContentScriptContext } from '#imports';

interface PromptSelectorProps {
  ctx: ContentScriptContext;
  prompts: PromptItemWithVariables[];
  targetElement: EditableElement;
  onClose: () => void;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({ ctx, prompts, targetElement, onClose }) => {
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
  const modalRef = useRef<HTMLDivElement>(null);
  const { message } = useAntd();

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
      message.success('Prompt copied to clipboard.');
      setTimeout(() => {
        setCopiedId(null);
      }, 2000); //Clear the copy status after 2 seconds
    } catch (err) {
      message.error('Error copying prompt.');
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
          // Ctrl+C (Windows) or Command+C (Mac) copy the currently selected prompt word
          if ((e.ctrlKey || e.metaKey) && filteredPrompts[selectedIndex]) {
            e.preventDefault();
            navigator.clipboard
              .writeText(filteredPrompts[selectedIndex].content)
              .then(() => {
                setCopiedId(filteredPrompts[selectedIndex].id);
                setTimeout(() => setCopiedId(null), 2000);
                message.success('Selected prompt copied to clipboard!');
              })
              .catch((err) => {
                message.error('Error copying prompt.');
                console.error(t('copyFailed'), err);
              });
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

  useEffect(() => {
    // Direct access to Shadow DOM through modalRef
    const shadowRoot = modalRef.current?.getRootNode() as ShadowRoot;
    if (!shadowRoot) return;

    const selectedElement = shadowRoot.querySelector(`#prompt-item-${selectedIndex}`);

    if (selectedElement && listRef.current) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  //Apply the selected prompt
  const applyPrompt = async (prompt: PromptItemWithVariables) => {
    //Extract the variables in the prompt word
    const variables = prompt._variables || extractVariables(prompt.content);
    prompt._variables = variables;

    // If the prompt word contains a variable, open the variable input pop-up window
    if (variables && variables.length > 0) {
      // Temporarily close the prompt selector
      onClose();

      //Display variable input pop-up window
      var ui = await createAndMountUI(ctx, {
        anchor: 'body',
        children: (
          <VariableInputModal
            prompt={prompt}
            targetElement={targetElement}
            onConfirm={(processedContent) => {
              // After the variables are filled in, use the processed content to apply to the target element
              applyProcessedContent(processedContent);
            }}
            onCancel={() => {
              // When canceling variable input, no operation is performed
              ui?.remove();
              console.log(t('variableInputCanceled'));
            }}
          />
        ),
      });

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

  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 1000);
  }, []);

  const handlePromptHover = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
    el.style.setProperty('--spot-color', useAppConfig().APP.COLOR_PRIMARY);
    el.style.setProperty('--spot-color-light', `${useAppConfig().APP.COLOR_PRIMARY}1A`);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      maskClosable={closeOnOutsideClick}
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
      keyboard={false}
    >
      <div ref={modalRef} className={isKeyboardNav ? 'keyboard-nav' : ''}>
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

        <div ref={listRef} className="flex flex-col max-h-[345px] overflow-y-scroll prompt-items">
          {filteredPrompts.length > 0 ? (
            filteredPrompts.map((prompt, index) => {
              const category = categoriesMap[prompt.categoryId];
              return (
                <div
                  id={`prompt-item-${index}`}
                  key={prompt.id}
                  className={`${index === selectedIndex ? 'selected-item' : ' '} prompt-item`}
                  onClick={() => applyPrompt(prompt)}
                  onMouseEnter={() => !isKeyboardNav && setSelectedIndex(index)}
                  onMouseMove={handlePromptHover}
                >
                  <div className="prompt-content flex auto gap-2.5">
                    <div className="space-y-2 w-full">
                      <div className="title font-bold">{prompt.title}</div>
                      <div className="line-clamp-1">{prompt.content}</div>
                    </div>

                    <Button icon={<CopyOutlined />} title="Copy" className="flex-none z-50" onClick={(e) => copyPrompt(e, prompt)} type="primary" />
                  </div>

                  <div className="meta z-50">
                    {category && (
                      <Tag color={useAppConfig().APP.COLOR_PRIMARY}>
                        <span className="size-2 inline-block rounded-full mr-1 border border-white" style={{ backgroundColor: category.color || useAppConfig().APP.COLOR_PRIMARY }}></span>
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
      </div>
    </Modal>
  );
};

//Create a pop-up window and mount the component
export async function showPromptSelector(ctx: ContentScriptContext, prompts: PromptItemWithVariables[], targetElement: EditableElement, onCloseCallback?: () => void): Promise<HTMLElement | null> {
  var ui = await createAndMountUI(ctx, {
    anchor: 'body',
    children: (
      <PromptSelector
        ctx={ctx}
        prompts={prompts}
        targetElement={targetElement}
        onClose={() => {
          onCloseCallback?.();
          ui?.remove();
        }}
      />
    ),
  });

  if (!ui) return null;
  return ui.uiContainer;
}
