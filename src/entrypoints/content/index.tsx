import { showPromptSelector } from './components/PromptSelector';
import { extractVariables } from './utils/variableParser';

export default defineContentScript({
  matches: ['*://*/*'],
  allFrames: true,
  matchAboutBlank: true,

  async main(ctx) {
    console.log(t('contentScriptLoaded'));

    let lastInputValue = '';
    let isPromptSelectorOpen = false;

    // Helper: Get all text content up to a specific node and offset
    const getTextUpToPosition = (container: Node, targetNode: Node, targetOffset: number): string => {
      let text = '';
      let found = false;

      const traverse = (node: Node): boolean => {
        if (found) return true;

        if (node === targetNode) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent?.substring(0, targetOffset) || '';
          }
          found = true;
          return true;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent || '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          // Handle line breaks
          if (element.tagName === 'BR') {
            text += '\n';
          }
          for (let i = 0; i < node.childNodes.length; i++) {
            if (traverse(node.childNodes[i])) {
              return true;
            }
          }
        }

        return false;
      };

      traverse(container);
      return text;
    };

    // Helper: Get the full text content preserving structure
    const getContentEditableValue = (element: HTMLElement): string => {
      const clonedElement = element.cloneNode(true) as HTMLElement;

      // Replace <br> with newlines
      clonedElement.querySelectorAll('br').forEach((br) => {
        br.replaceWith('\n');
      });

      // Replace <div> with newlines (WhatsApp uses divs for line breaks)
      clonedElement.querySelectorAll('div').forEach((div) => {
        if (div.previousSibling) {
          div.prepend(document.createTextNode('\n'));
        }
      });

      return clonedElement.textContent || '';
    };

    // Helper: Set content while preserving cursor position
    const setContentEditableValue = (element: HTMLElement, value: string): void => {
      const selection = window.getSelection();
      let cursorOffset = 0;

      // Save cursor position
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (element.contains(range.startContainer)) {
          cursorOffset = getTextUpToPosition(element, range.startContainer, range.startOffset).length;
        }
      }

      // For WhatsApp and similar apps, use innerText to preserve some formatting
      // or insert text at cursor instead of replacing everything
      const useInnerText = element.querySelector('span, div, br') !== null;

      if (useInnerText) {
        element.innerText = value;
      } else {
        element.textContent = value;
      }

      // Trigger input event
      const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
      element.dispatchEvent(inputEvent);

      // Restore cursor position
      setTimeout(() => {
        try {
          const sel = window.getSelection();
          if (sel) {
            const textContent = getContentEditableValue(element);
            const newOffset = Math.min(cursorOffset, textContent.length);

            // Find the text node at the desired offset
            let currentOffset = 0;
            let targetNode: Node | null = null;
            let targetOffset = 0;

            const findNode = (node: Node): boolean => {
              if (node.nodeType === Node.TEXT_NODE) {
                const nodeLength = node.textContent?.length || 0;
                if (currentOffset + nodeLength >= newOffset) {
                  targetNode = node;
                  targetOffset = newOffset - currentOffset;
                  return true;
                }
                currentOffset += nodeLength;
              } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                  if (findNode(node.childNodes[i])) return true;
                }
              }
              return false;
            };

            findNode(element);

            if (targetNode) {
              const range = document.createRange();
              range.setStart(targetNode, targetOffset);
              range.setEnd(targetNode, targetOffset);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        } catch (error) {
          console.error('Failed to restore cursor position:', error);
        }
      }, 0);
    };

    const createEditableAdapter = (element: HTMLElement): EditableElement => {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element;
      } else if (element.getAttribute('contenteditable') === 'true') {
        const adapter = {
          _element: element,
          get value(): string {
            return getContentEditableValue(element);
          },
          set value(newValue: string) {
            setContentEditableValue(element, newValue);
          },
          get selectionStart(): number {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              if (element.contains(range.startContainer)) {
                return getTextUpToPosition(element, range.startContainer, range.startOffset).length;
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
              if (!selection) return;

              selection.removeAllRanges();
              const range = document.createRange();

              // Find the node and offset for the start position
              let currentOffset = 0;
              let startNode: Node | null = null;
              let startOffset = 0;
              let endNode: Node | null = null;
              let endOffset = 0;

              const findNodes = (node: Node): void => {
                if (node.nodeType === Node.TEXT_NODE) {
                  const nodeLength = node.textContent?.length || 0;

                  if (!startNode && currentOffset + nodeLength >= start) {
                    startNode = node;
                    startOffset = start - currentOffset;
                  }

                  if (!endNode && currentOffset + nodeLength >= end) {
                    endNode = node;
                    endOffset = end - currentOffset;
                  }

                  currentOffset += nodeLength;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  for (let i = 0; i < node.childNodes.length; i++) {
                    if (startNode && endNode) break;
                    findNodes(node.childNodes[i]);
                  }
                }
              };

              findNodes(element);

              if (startNode && endNode) {
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                selection.addRange(range);
              } else if (element.childNodes.length > 0) {
                // Fallback: place cursor at the end
                const lastChild = element.childNodes[element.childNodes.length - 1];
                const offset = lastChild.nodeType === Node.TEXT_NODE ? lastChild.textContent?.length || 0 : 0;
                range.setStart(lastChild, offset);
                range.setEnd(lastChild, offset);
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

    const getFocusedTextInput = (): EditableElement | null => {
      const activeElement = document.activeElement;

      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        return activeElement;
      } else if (activeElement instanceof HTMLElement && activeElement.getAttribute('contenteditable') === 'true') {
        return createEditableAdapter(activeElement);
      }
      return null;
    };

    const openOptionsWithText = async (text: string) => {
      try {
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

    const contentEditableValuesMap = new WeakMap<HTMLElement, string>();

    document.addEventListener('input', async (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        const inputElement = event.target as HTMLInputElement | HTMLTextAreaElement;
        const value = inputElement.value;

        if (value?.toLowerCase()?.endsWith('/p') && lastInputValue !== value && !isPromptSelectorOpen) {
          lastInputValue = value;
          await openPromptSelector(inputElement);
        } else if (!value?.toLowerCase()?.endsWith('/p')) {
          lastInputValue = value;
        }
      } else if (event.target instanceof HTMLElement && event.target.getAttribute('contenteditable') === 'true') {
        const editableElement = event.target as HTMLElement;
        const adapter = createEditableAdapter(editableElement);
        const value = adapter.value;
        const lastValue = contentEditableValuesMap.get(editableElement) || '';

        if (value?.toLowerCase()?.endsWith('/p') && lastValue !== value && !isPromptSelectorOpen) {
          contentEditableValuesMap.set(editableElement, value);
          await openPromptSelector(adapter);
        } else if (!value?.toLowerCase()?.endsWith('/p')) {
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

// import { showPromptSelector } from './components/PromptSelector';
// import { extractVariables } from './utils/variableParser';

// export default defineContentScript({
//   matches: ['*://*/*'],
//   allFrames: true,
//   matchAboutBlank: true,
//   runAt: 'document_end',

//   async main(ctx) {
//     console.log(t('contentScriptLoaded'));

//     //Record the status of the last input
//     let lastInputValue = '';
//     let isPromptSelectorOpen = false;

//     // Get the content of the contenteditable element
//     const getContentEditableValue = (element: HTMLElement): string => {
//       return element.textContent || '';
//     };

//     //Set the content of the contenteditable element
//     const setContentEditableValue = (element: HTMLElement, value: string): void => {
//       element.textContent = value;
//       // Trigger the input event to notify other listeners of content changes
//       const inputEvent = new InputEvent('input', { bubbles: true });
//       element.dispatchEvent(inputEvent);
//     };

//     //Create an adapter to uniformly handle different types of input elements
//     const createEditableAdapter = (element: HTMLElement | HTMLInputElement | HTMLTextAreaElement): EditableElement => {
//       // Process standard input elements
//       if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
//         return element;
//       }
//       // handle contenteditable elements
//       else if (element.getAttribute('contenteditable') === 'true') {
//         const adapter = {
//           _element: element, //Save the original element reference
//           get value(): string {
//             return getContentEditableValue(element);
//           },
//           set value(newValue: string) {
//             setContentEditableValue(element, newValue);
//           },
//           // The contenteditable element does not have a native selectionStart attribute.
//           // But the current cursor position can be obtained through the selection API
//           get selectionStart(): number {
//             const selection = window.getSelection();
//             if (selection && selection.rangeCount > 0) {
//               const range = selection.getRangeAt(0);
//               if (element.contains(range.startContainer)) {
//                 return range.startOffset;
//               }
//             }
//             return 0;
//           },
//           focus(): void {
//             element.focus();
//           },
//           setSelectionRange(start: number, end: number): void {
//             try {
//               const selection = window.getSelection();
//               if (selection) {
//                 selection.removeAllRanges();
//                 const range = document.createRange();
//                 // Try setting the range in the text node
//                 let textNode = element.firstChild;
//                 if (!textNode) {
//                   textNode = document.createTextNode('');
//                   element.appendChild(textNode);
//                 }
//                 range.setStart(textNode, Math.min(start, textNode.textContent?.length || 0));
//                 range.setEnd(textNode, Math.min(end, textNode.textContent?.length || 0));
//                 selection.addRange(range);
//               }
//             } catch (error) {
//               console.error('Setting contenteditable cursor position failed:', error);
//             }
//           },
//           dispatchEvent(event: Event): boolean {
//             return element.dispatchEvent(event);
//           },
//         };
//         return adapter as EditableElement;
//       }
//       return null as unknown as EditableElement;
//     };

//     // General function: Get the currently focused input box element (if any)
//     const getFocusedTextInput = (): EditableElement | null => {
//       const activeElement = document.activeElement;

//       if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
//         return activeElement;
//       }
//       //Support contenteditable elements
//       else if (activeElement instanceof HTMLElement && activeElement.getAttribute('contenteditable') === 'true') {
//         return createEditableAdapter(activeElement);
//       }
//       return null;
//     };

//     // General function: open the options page and pass the selected text
//     const openOptionsWithText = async (text: string) => {
//       try {
//         // Do not use the tabs API directly, but send messages to the background script
//         const response = await browser.runtime.sendMessage({
//           action: 'openOptionsPageWithText',
//           text: text,
//         });

//         console.log('Content script: Requested background script to open options page', response);
//         return response && response.success;
//       } catch (error) {
//         console.error('Content script: Request to open options page failed:', error);
//         return false;
//       }
//     };

//     // General function: open the prompt word selector
//     const openPromptSelector = async (inputElement?: EditableElement) => {
//       if (isPromptSelectorOpen) return;

//       try {
//         isPromptSelectorOpen = true;
//         console.log('Get ready to open the prompt word selector...');

//         //Save the currently active element
//         const activeElement = document.activeElement as HTMLElement;

//         // If no input box is provided, try to get the currently focused input box
//         const targetInput = inputElement || getFocusedTextInput();

//         // If no input box is found, give a prompt and return
//         if (!targetInput) {
//           alert(t('clickInputBoxFirst'));
//           isPromptSelectorOpen = false;
//           return;
//         }

//         // Perform data migration first to ensure that the classification information is correct
//         await migratePromptsWithCategory();

//         // Get all prompt words from storage
//         const allPrompts = (await storage.getItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`)) || [];

//         // Filter to only keep enabled prompt words
//         const prompts: PromptItemWithVariables[] = allPrompts.filter((prompt) => prompt.enabled !== false);

//         // Preprocess variables in prompt words
//         prompts.forEach((prompt) => {
//           //Extract variables from content
//           prompt._variables = extractVariables(prompt.content);
//         });

//         if (prompts && prompts.length > 0) {
//           console.log(`Found in total ${prompts.length} Enabled prompt words, display selector...`);

//           // Display prompt word selector pop-up window
//           const container = showPromptSelector(ctx, prompts, targetInput, () => {
//             //Restore focus when selector closes
//             if (activeElement && typeof activeElement.focus === 'function') {
//               setTimeout(() => {
//                 console.log(t('restoreFocus'));
//                 activeElement.focus();
//               }, 100);
//             }
//             isPromptSelectorOpen = false;
//           });

//           //Set theme
//           // if (container) {
//           //   setThemeAttributes(container);
//           // }
//         } else {
//           console.log(t('noEnabledPromptsFound'));
//           alert(t('noEnabledPromptsAlert'));
//           isPromptSelectorOpen = false;
//         }
//       } catch (error) {
//         console.error(t('errorGettingPrompts'), error);
//         isPromptSelectorOpen = false;
//       }
//     };

//     // Used to record the last content of editable elements
//     const contentEditableValuesMap = new WeakMap<HTMLElement, string>();

//     //Listen to input box input events
//     document.addEventListener('input', async (event) => {
//       // Check whether the event target is a standard input element (input box or text field)
//       if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
//         const inputElement = event.target as HTMLInputElement | HTMLTextAreaElement;
//         const value = inputElement.value;

//         // Check if "/p" has been entered and the pop-up window has not yet opened
//         if (value?.toLowerCase()?.endsWith('/p') && lastInputValue !== value && !isPromptSelectorOpen) {
//           lastInputValue = value;

//           // Use a general function to open the prompt word selector
//           await openPromptSelector(inputElement);
//         } else if (!value?.toLowerCase()?.endsWith('/p')) {
//           //Update the last input value
//           lastInputValue = value;
//         }
//       }
//       //Support input detection of contenteditable elements
//       else if (event.target instanceof HTMLElement && event.target.getAttribute('contenteditable') === 'true') {
//         const editableElement = event.target as HTMLElement;
//         const adapter = createEditableAdapter(editableElement);
//         const value = adapter.value;

//         // Get the last value, if not, it is an empty string
//         const lastValue = contentEditableValuesMap.get(editableElement) || '';

//         // Check if "/p" has been entered and the pop-up window has not yet opened
//         if (value?.toLowerCase()?.endsWith('/p') && lastValue !== value && !isPromptSelectorOpen) {
//           contentEditableValuesMap.set(editableElement, value);

//           // Use a general function to open the prompt word selector
//           await openPromptSelector(adapter);
//         } else if (!value?.toLowerCase()?.endsWith('/p')) {
//           //Update the last input value
//           contentEditableValuesMap.set(editableElement, value);
//         }
//       }
//     });

//     // Listen for messages from the background script
//     browser.runtime.onMessage.addListener(async (message) => {
//       console.log('Content script: Message received', message);

//       if (message.action === 'openPromptSelector') {
//         // Use a general function to open the prompt word selector
//         await openPromptSelector();
//         return { success: true };
//       }

//       if (message.action === 'getSelectedText') {
//         try {
//           // Get the currently selected text
//           const selectedText = window.getSelection()?.toString() || '';
//           console.log('Content script: Get selected text:', selectedText);

//           if (selectedText) {
//             // If there is selected text, open the options page through the background script
//             const opened = await openOptionsWithText(selectedText);
//             return { success: true, text: selectedText, openedOptionsPage: opened };
//           } else {
//             console.log('Content script: No text selected');
//             return { success: true, text: '' };
//           }
//         } catch (error) {
//           console.error(t('errorGettingSelectedText'), error);
//           return { success: false, error: t('getSelectedTextFailed') };
//         }
//       }

//       return false;
//     });
//   },
// });
