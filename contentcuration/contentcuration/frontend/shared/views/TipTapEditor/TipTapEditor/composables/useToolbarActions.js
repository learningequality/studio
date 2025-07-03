import { computed, inject } from 'vue';
import { getTipTapEditorStrings } from '../TipTapEditorStrings';

export function useToolbarActions() {
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
    if (editor.value) {
      const { state } = editor.value;
      const { from, to } = state.selection;

      if (from === to) return; // No selection

      // Get selected text
      const selectedText = state.doc.textBetween(from, to, '\n');

      // Use browser's native selection to get the actual selected HTML
      const selection = window.getSelection();
      let selectedHtml = '';

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const contents = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(contents);
        selectedHtml = tempDiv.innerHTML;
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([selectedHtml], { type: 'text/html' }),
            'text/plain': new Blob([selectedText], { type: 'text/plain' }),
          }),
        ]);
      } catch (err) {
        // Fallback to plain text
        await navigator.clipboard.writeText(selectedText);
      }
    }
  };

  const handlePaste = async () => {
    if (editor.value) {
      try {
        // Try HTML first
        const clipboardData = await navigator.clipboard.read();
        const htmlType = clipboardData[0].types.find(type => type === 'text/html');

        if (htmlType) {
          const htmlBlob = await clipboardData[0].getType('text/html');
          const html = await htmlBlob.text();
          editor.value.chain().focus().insertContent(html).run();
        } else {
          // Fall back to plain text
          handlePasteNoFormat();
        }
      } catch (err) {
        editor.value.chain().focus().insertContent(clipboardAccessFailed$()).run();
      }
    }
  };

  const handlePasteNoFormat = async () => {
    if (editor.value) {
      try {
        // Read plain text from clipboard
        const text = await navigator.clipboard.readText();
        editor.value.chain().focus().insertContent(text).run();
      } catch (err) {
        editor.value.chain().focus().insertContent(clipboardAccessFailed$()).run();
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

  const handleInsertImage = () => {
    // placeholder
  };

  const handleInsertLink = () => {
    // placeholder
  };

  const handleMath = () => {
    // TipTap math formula logic may be added here
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
      editor.value.chain().focus().clearNodes().unsetAllMarks().setParagraph().run();
    }
  };

  // Helper function to check if a mark is active
  const isMarkActive = markName => {
    return editor?.value?.isActive(markName) || false;
  };

  // Helper function to check if any of the main marks are active
  const hasClearableMark = () => {
    if (!editor?.value) return false;
    const marks = ['bold', 'italic', 'underline', 'strike'];
    return marks.some(mark => editor.value.isActive(mark));
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
    listActions,
    scriptActions,
    insertTools,
  };
}
