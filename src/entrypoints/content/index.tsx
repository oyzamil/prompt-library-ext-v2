import { showPromptSelector } from './components/PromptSelector';
import { extractVariables } from './utils/variableParser';

const dev = [
  '*://*.example.com/*',
  '*://*.softwebtuts.blogspot.com/*',
  '*://foundrlist.com/*',
  '*://claude.ai/*',
];
const production = ['<all_urls>'];

export default defineContentScript({
  matches: import.meta.env.MODE === 'development' ? dev : production,
  allFrames: true,
  matchAboutBlank: true,

  async main(ctx) {
    console.log(t('contentScriptLoaded'));

    let lastInputValue = '';
    let isPromptSelectorOpen = false;

    // Get the content of the contenteditable element
    const getContentEditableValue = (element: HTMLElement): string => {
      return element.textContent || '';
    };

    // Set the content of the contenteditable element
    const setContentEditableValue = (element: HTMLElement, value: string): void => {
      element.textContent = value;
      // Trigger the input event to notify other listeners of content changes
      const inputEvent = new InputEvent('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
    };

    // Create adapters to uniformly handle different types of input elements
    const createEditableAdapter = (element: HTMLElement | HTMLInputElement | HTMLTextAreaElement): EditableElement => {
      // Process standard input elements
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element;
      }
      // Handling contenteditable elements
      else if (element.getAttribute('contenteditable') === 'true') {
        const adapter = {
          _element: element, // Save original element reference
          get value(): string {
            return getContentEditableValue(element);
          },
          set value(newValue: string) {
            setContentEditableValue(element, newValue);
          },
          // The contenteditable element does not have a native selectionStart attribute.
          // But you can get the current cursor position through the selection API
          get selectionStart(): number {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              if (element.contains(range.startContainer)) {
                return range.startOffset;
              }
            }
            return 0;
          },
          focus(): void {
            element.focus();
          },
          setSelectionRange(start: number, end: number): void {
            try {
              const selection = window.getSelection();
              if (selection) {
                selection.removeAllRanges();
                const range = document.createRange();
                // Try setting range in text node
                let textNode = element.firstChild;
                if (!textNode) {
                  textNode = document.createTextNode('');
                  element.appendChild(textNode);
                }
                range.setStart(textNode, Math.min(start, textNode.textContent?.length || 0));
                range.setEnd(textNode, Math.min(end, textNode.textContent?.length || 0));
                selection.addRange(range);
              }
            } catch (error) {
              console.error('Setting contenteditable cursor position failed:', error);
            }
          },
          dispatchEvent(event: Event): boolean {
            return element.dispatchEvent(event);
          },
        };
        return adapter as EditableElement;
      }
      return null as unknown as EditableElement;
    };

    // Universal function: Get the currently focused input box element (if any)
    const getFocusedTextInput = (): EditableElement | null => {
      const activeElement = document.activeElement;

      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        return activeElement;
      }
      // Support contenteditable elements
      else if (activeElement instanceof HTMLElement && activeElement.getAttribute('contenteditable') === 'true') {
        return createEditableAdapter(activeElement);
      }
      return null;
    };

    // Generic function: Open options page and pass selected text
    const openOptionsWithText = async (text: string) => {
      try {
        // Instead of using the tabs API directly, send messages to background scripts
        const response = await browser.runtime.sendMessage({
          action: 'openOptionsPageWithText',
          text: text,
        });

        console.log('Content script: Requested background script to open options page', response);
        return response && response.success;
      } catch (error) {
        console.error('Content script: Request to open options page failed:', error);
        return false;
      }
    };

    const openPromptSelector = async (inputElement?: EditableElement) => {
      if (isPromptSelectorOpen) return;

      try {
        isPromptSelectorOpen = true;
        console.log('Get ready to open the prompt word selector...');

        const activeElement = document.activeElement as HTMLElement;
        const targetInput = inputElement || getFocusedTextInput();

        if (!targetInput) {
          alert(t('clickInputBoxFirst'));
          isPromptSelectorOpen = false;
          return;
        }

        await migratePromptsWithCategory();
        const allPrompts = (await storage.getItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`)) || [];
        const prompts: PromptItemWithVariables[] = allPrompts.filter((prompt) => prompt.enabled !== false);

        prompts.forEach((prompt) => {
          prompt._variables = extractVariables(prompt.content);
        });

        if (prompts && prompts.length > 0) {
          console.log(`Found in total ${prompts.length} Enabled prompt words, display selector...`);

          const container = showPromptSelector(ctx, prompts, targetInput, () => {
            if (activeElement && typeof activeElement.focus === 'function') {
              setTimeout(() => {
                console.log(t('restoreFocus'));
                activeElement.focus();
              }, 100);
            }
            isPromptSelectorOpen = false;
          });
        } else {
          console.log(t('noEnabledPromptsFound'));
          alert(t('noEnabledPromptsAlert'));
          isPromptSelectorOpen = false;
        }
      } catch (error) {
        console.error(t('errorGettingPrompts'), error);
        isPromptSelectorOpen = false;
      }
    };

    // Used to record the last content of an editable element
    const contentEditableValuesMap = new WeakMap<HTMLElement, string>();

    // Listen to input box input events
    document.addEventListener('input', async (event) => {
      // Checks whether the event target is a standard input element (input box or text field)
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        const inputElement = event.target as HTMLInputElement | HTMLTextAreaElement;
        const value = inputElement.value;

        // Check if "/p" has been entered and the pop-up window has not yet opened
        if (value?.toLowerCase()?.endsWith('/p') && lastInputValue !== value && !isPromptSelectorOpen) {
          lastInputValue = value;

          // Use a generic function to open the prompt word selector
          await openPromptSelector(inputElement);
        } else if (!value?.toLowerCase()?.endsWith('/p')) {
          // Update last input value
          lastInputValue = value;
        }
      }
      // Support input detection for contenteditable elements
      else if (event.target instanceof HTMLElement && event.target.getAttribute('contenteditable') === 'true') {
        const editableElement = event.target as HTMLElement;
        const adapter = createEditableAdapter(editableElement);
        const value = adapter.value;

        // Get the last value, or an empty string if there is none
        const lastValue = contentEditableValuesMap.get(editableElement) || '';

        // Check if "/p" has been entered and the pop-up window has not yet opened
        if (value?.toLowerCase()?.endsWith('/p') && lastValue !== value && !isPromptSelectorOpen) {
          contentEditableValuesMap.set(editableElement, value);

          // Use a generic function to open the prompt word selector
          await openPromptSelector(adapter);
        } else if (!value?.toLowerCase()?.endsWith('/p')) {
          // Update last input value
          contentEditableValuesMap.set(editableElement, value);
        }
      }
    });

    browser.runtime.onMessage.addListener(async (message) => {
      console.log('Content script: Message received', message);

      if (message.action === 'openPromptSelector') {
        await openPromptSelector();
        return { success: true };
      }

      if (message.action === 'getSelectedText') {
        try {
          const selectedText = window.getSelection()?.toString() || '';
          console.log('Content script: Get selected text:', selectedText);

          if (selectedText) {
            const opened = await openOptionsWithText(selectedText);
            return { success: true, text: selectedText, openedOptionsPage: opened };
          } else {
            console.log('Content script: No text selected');
            return { success: true, text: '' };
          }
        } catch (error) {
          console.error(t('errorGettingSelectedText'), error);
          return { success: false, error: t('getSelectedTextFailed') };
        }
      }

      return false;
    });
  },
});