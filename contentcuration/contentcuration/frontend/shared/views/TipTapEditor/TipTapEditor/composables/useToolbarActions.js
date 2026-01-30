import { computed, inject } from 'vue';
import { getTipTapEditorStrings } from '../TipTapEditorStrings';
import { sanitizePastedHTML } from '../utils/markdown';

export function useToolbarActions(emit) {
  const editor = inject('editor', null);

  const {
    undo$,
    redo$,
    bold$,
    italic$,
    underline$,
    strikethrough$,
    bulletList$,
    numberedList$,
    subscript$,
    superscript$,
    insertImage$,
    insertLink$,
    mathFormula$,
    codeBlock$,
    clipboardAccessFailed$,
    alignLeft$,
    alignRight$,
  } = getTipTapEditorStrings();

  // Action handlers
  const handleUndo = () => {
    if (editor?.value) {
      editor.value.chain().focus().undo().run();
    }
  };

  const handleRedo = () => {
    if (editor?.value) {
      editor.value.chain().focus().redo().run();
    }
  };

  const handleBold = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleBold().run();
    }
  };

  const handleItalic = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleItalic().run();
    }
  };

  const handleUnderline = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleUnderline().run();
    }
  };

  const handleStrikethrough = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleStrike().run();
    }
  };

  // Copy with formatting
  const handleCopy = async () => {
    if (!editor.value) return;

    const { state } = editor.value;
    const { from, to } = state.selection;

    if (from === to) return; // No selection

    // Get selected text for plain text fallback
    const selectedText = state.doc.textBetween(from, to, '\n');

    try {
      // Get HTML directly from the current selection
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());

        // Process math elements specifically
        const mathFields = container.querySelectorAll('math-field');
        mathFields.forEach(mathField => {
          const latex = mathField.getAttribute('value') || '';
          const span = document.createElement('span');
          span.className = 'math-inline';
          span.setAttribute('data-latex', latex);
          span.textContent = `\\(${latex}\\)`;
          mathField.parentNode.replaceChild(span, mathField);
        });

        // Remove elements marked with data-copy-ignore
        const copyIgnoreElements = container.querySelectorAll('[data-copy-ignore]');
        copyIgnoreElements.forEach(el => el.remove());

        // Remove Vue-specific attributes and wrapper divs
        const allElements = container.querySelectorAll('*');
        allElements.forEach(el => {
          // Remove Vue data attributes
          Array.from(el.attributes).forEach(attr => {
            if (
              attr.name.startsWith('data-v-') ||
              attr.name === 'data-node-view-wrapper' ||
              attr.name === 'contenteditable' ||
              attr.name === 'tabindex' ||
              attr.name === 'data-copy-ignore'
            ) {
              el.removeAttribute(attr.name);
            }
          });

          // Remove wrapper divs
          if (el.classList.contains('math-node-wrapper')) {
            while (el.firstChild) {
              el.parentNode.insertBefore(el.firstChild, el);
            }
            el.remove();
          }
        });

        const cleanHtml = container.innerHTML;

        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([cleanHtml], { type: 'text/html' }),
            'text/plain': new Blob([selectedText], { type: 'text/plain' }),
          }),
        ]);
      }
    } catch (err) {
      // Fallback to plain text
      await navigator.clipboard.writeText(selectedText);
    }
  };

  const handlePaste = async () => {
    if (!editor.value) return;

    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();

        for (const item of items) {
          if (item.types.includes('text/html')) {
            const htmlBlob = await item.getType('text/html');
            const html = await htmlBlob.text();
            const cleaned = sanitizePastedHTML(html);

            editor.value.chain().focus().insertContent(cleaned).run();
            return;
          }
          if (item.types.includes('text/plain')) {
            const textBlob = await item.getType('text/plain');
            const text = await textBlob.text();

            editor.value.chain().focus().insertContent(text).run();
            return;
          }
        }
      }
    } catch (err) {
      editor.value.chain().focus().insertContent(clipboardAccessFailed$()).run();
    }
  };

  const handlePasteNoFormat = async () => {
    if (!editor.value) return;

    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      // Note: Genereted this regex with the help of LLM.
      const normalized = text.replace(/\r\n/g, '\n');

      editor.value.chain().focus().insertContent(normalized).run();
    } catch (err) {
      editor.value.chain().focus().insertContent(clipboardAccessFailed$()).run();
    }
  };

  const handleToggleAlign = () => {
    if (editor?.value) {
      const isRightAligned = editor.value.isActive({ textAlign: 'right' });
      if (isRightAligned) {
        editor.value.chain().focus().setTextAlign('left').run();
      } else {
        editor.value.chain().focus().setTextAlign('right').run();
      }
    }
  };

  const handleBulletList = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleBulletList().run();
    }
  };

  const handleNumberList = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleOrderedList().run();
    }
  };

  const handleSubscript = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleSubscript().run();
    }
  };

  const handleSuperscript = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleSuperscript().run();
    }
  };

  const handleInsertImage = target => {
    emit('insert-image', target);
  };

  const handleInsertLink = () => {
    emit('insert-link');
  };

  const handleMath = () => {
    emit('insert-math', event.currentTarget);
  };

  const handleCodeBlock = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleCodeBlock().run();
    }
  };

  const handleFormatChange = format => {
    if (!editor?.value) return;

    switch (format) {
      case 'normal':
        // Clear any existing formatting and set to paragraph
        editor.value.chain().focus().clearNodes().setParagraph().run();
        break;
      case 'h1':
        editor.value.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.value.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.value.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'small':
        // Convert to paragraph first, then apply small mark
        editor.value.chain().focus().setSmall().run();
        break;
      default:
        break;
    }
  };

  const handleClearFormat = () => {
    if (editor?.value) {
      editor.value.chain().focus().unsetAllMarks().run();
    }
  };

  const handleMinimize = () => {
    emit('minimize');
  };

  // Helper function to check if a mark is active
  const isMarkActive = markName => {
    return editor?.value?.isActive(markName) || false;
  };

  // Helper function to check if any of the main marks are active
  const hasClearableMark = () => {
    if (!editor?.value) return false;
    const { from, to, empty } = editor.value.state.selection;
    if (empty) {
      return false;
    }

    let hasMarks = false;
    editor.value.state.doc.nodesBetween(from, to, node => {
      if (node.marks.length > 0) {
        hasMarks = true;
      }
    });
    return hasMarks;
  };

  const isButtonAvailable = action => {
    if (!editor?.value) return false;

    switch (action) {
      case 'undo':
        return editor.value.can().undo();
      case 'redo':
        return editor.value.can().redo();
      case 'removeFormat':
        return hasClearableMark();
      default:
        return true;
    }
  };

  // Computed arrays for toolbar actions
  const historyActions = computed(() => [
    {
      name: 'undo',
      title: undo$(),
      icon: require('../../assets/icon-undo.svg'),
      handler: handleUndo,
      isAvailable: isButtonAvailable('undo'),
    },
    {
      name: 'redo',
      title: redo$(),
      icon: require('../../assets/icon-redo.svg'),
      handler: handleRedo,
      isAvailable: isButtonAvailable('redo'),
    },
  ]);

  const textActions = computed(() => [
    {
      name: 'bold',
      title: bold$(),
      icon: require('../../assets/icon-bold.svg'),
      handler: handleBold,
      isActive: isMarkActive('bold'),
    },
    {
      name: 'italic',
      title: italic$(),
      icon: require('../../assets/icon-italic.svg'),
      handler: handleItalic,
      isActive: isMarkActive('italic'),
    },
    {
      name: 'underline',
      title: underline$(),
      icon: require('../../assets/icon-underline.svg'),
      handler: handleUnderline,
      isActive: isMarkActive('underline'),
    },
    {
      name: 'strikethrough',
      title: strikethrough$(),
      icon: require('../../assets/icon-strikethrough.svg'),
      handler: handleStrikethrough,
      isActive: isMarkActive('strike'),
    },
  ]);

  const listActions = computed(() => [
    {
      name: 'bulletList',
      title: bulletList$(),
      icon: require('../../assets/icon-bulletList.svg'),
      handler: handleBulletList,
      isActive: isMarkActive('bulletList'),
    },
    {
      name: 'numberList',
      title: numberedList$(),
      icon: require('../../assets/icon-numberList.svg'),
      rtlIcon: require('../../assets/icon-numberListRTL.svg'),
      handler: handleNumberList,
      isActive: isMarkActive('orderedList'),
    },
  ]);

  const scriptActions = computed(() => [
    {
      name: 'subscript',
      title: subscript$(),
      icon: require('../../assets/icon-subscript.svg'),
      rtlIcon: require('../../assets/icon-subscriptRTL.svg'),
      handler: handleSubscript,
      isActive: isMarkActive('subscript'),
    },
    {
      name: 'superscript',
      title: superscript$(),
      icon: require('../../assets/icon-superscript.svg'),
      rtlIcon: require('../../assets/icon-superscriptRTL.svg'),
      handler: handleSuperscript,
      isActive: isMarkActive('superscript'),
    },
  ]);

  const insertTools = computed(() => [
    {
      name: 'image',
      title: insertImage$(),
      icon: require('../../assets/icon-insertImage.svg'),
      handler: handleInsertImage,
    },
    {
      name: 'link',
      title: insertLink$(),
      icon: require('../../assets/icon-link.svg'),
      isActive: isMarkActive('link'),
      handler: handleInsertLink,
    },
    {
      name: 'math',
      title: mathFormula$(),
      icon: require('../../assets/icon-formula.svg'),
      handler: handleMath,
    },
    {
      name: 'code',
      title: codeBlock$(),
      icon: require('../../assets/icon-codeblock.svg'),
      handler: handleCodeBlock,
      isActive: isMarkActive('codeBlock'),
    },
  ]);

  const minimizeAction = {
    name: 'minimize',
    title: 'Minimize Toolbar',
    icon: require('../../assets/icon-unfold.svg'),
    handler: handleMinimize,
  };

  const alignAction = computed(() => {
    const isRightAligned = editor?.value?.isActive({ textAlign: 'right' }) || false;
    return {
      name: 'toggleAlign',
      title: isRightAligned ? alignLeft$() : alignRight$(),
      icon: isRightAligned
        ? require('../../assets/icon-alignLeft.svg')
        : require('../../assets/icon-alignRight.svg'),
      handler: handleToggleAlign,
      isActive: false,
      isAvailable: !isMarkActive('codeBlock'),
    };
  });

  return {
    // Individual handlers
    handleUndo,
    handleRedo,
    handleBold,
    handleItalic,
    handleUnderline,
    handleStrikethrough,
    handleCopy,
    handlePaste,
    handlePasteNoFormat,
    handleToggleAlign,
    handleBulletList,
    handleNumberList,
    handleSubscript,
    handleSuperscript,
    handleInsertImage,
    handleInsertLink,
    handleMath,
    handleCodeBlock,
    handleFormatChange,
    handleClearFormat,
    canClearFormat: computed(() => isButtonAvailable('removeFormat')),

    // Action arrays
    historyActions,
    textActions,
    alignAction,
    listActions,
    scriptActions,
    insertTools,
    minimizeAction,
  };
}
